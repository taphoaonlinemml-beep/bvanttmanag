import { describe, expect, it } from "vitest";
import { importUnitCatalogWithExecutor } from "./db";

type StoredUnit = { id: number; code: string; name: string; unitType: string; parentId: number | null; maxMembers: number; address: string | null; isActive: string };

function createTransactionExecutor(options?: { failOnInsert?: number; batchResultWithoutPerRowIds?: boolean; initialUnits?: StoredUnit[]; linkedPersonnel?: number }) {
  let nextId = Math.max(1, ...(options?.initialUnits?.map(item => item.id) ?? []));
  let insertCount = 0;
  const state: StoredUnit[] = (options?.initialUnits ?? []).map(item => ({ ...item }));
  let selectCount = 0;
  const executor = {
    async transaction<T>(callback: (tx: any) => Promise<T>) {
      const snapshot = state.map(item => ({ ...item }));
      try {
        return await callback({
          select: () => ({ from: () => {
            selectCount += 1;
            const result = selectCount === 2 && options?.linkedPersonnel !== undefined
              ? [{ total: options.linkedPersonnel }]
              : state.map(({ id, code, name, unitType, parentId, maxMembers }) => ({ id, code, name, unitType, parentId, maxMembers }));
            return { then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(result).then(resolve, reject), where: async () => result };
          } }),
          insert: () => ({ values: async (value: Omit<StoredUnit, "id"> | Array<Omit<StoredUnit, "id">>) => {
            insertCount += 1;
            if (options?.failOnInsert === insertCount) throw new Error("Lỗi ghi dữ liệu giả lập");
            const values = Array.isArray(value) ? value : [value];
            const inserted = values.map(item => { nextId += 1; state.push({ id: nextId, ...item }); return { insertId: nextId }; });
            return options?.batchResultWithoutPerRowIds && Array.isArray(value) ? [{ insertId: inserted[0]?.insertId }] : inserted;
          } }),
          update: () => ({ set: (value: Partial<StoredUnit>) => ({ where: async () => {
            const existingTeam = state.find(item => item.unitType === "team");
            if (existingTeam) Object.assign(existingTeam, value);
          } }) }),
          delete: () => ({ where: async () => {
            const targetType = state.some(item => item.unitType === "team") ? "team" : "ward";
            for (let index = state.length - 1; index >= 0; index -= 1) if (state[index]?.unitType === targetType) state.splice(index, 1);
          } }),
        });
      } catch (error) {
        state.splice(0, state.length, ...snapshot);
        throw error;
      }
    },
  };
  return { executor, state, getInsertCount: () => insertCount };
}

describe("importUnitCatalogWithExecutor", () => {
  it("creates wards once and attaches multiple teams to the corresponding ward", async () => {
    const { executor, state } = createTransactionExecutor();
    const result = await importUnitCatalogWithExecutor(executor, [
      { wardName: "Phường An Bình", unitName: "Tổ 1", maxMembers: 10 },
      { wardName: "Phường An Bình", unitName: "Tổ 2", maxMembers: 12 },
      { wardName: "Xã Bình Minh", unitName: null, maxMembers: 0 },
    ]);

    expect(result).toEqual({ totalWards: 2, totalTeams: 2, removedWards: 0, removedUnits: 0 });
    expect(state.filter(item => item.unitType === "ward")).toHaveLength(2);
    expect(state.filter(item => item.unitType === "team")).toHaveLength(2);
    expect(state.find(item => item.name === "Tổ 1")?.parentId).toBe(state.find(item => item.name === "Phường An Bình")?.id);
  });

  it("does not retain partial catalog records when an insert fails in the transaction", async () => {
    const { executor, state } = createTransactionExecutor({ failOnInsert: 2 });
    await expect(importUnitCatalogWithExecutor(executor, [{ wardName: "Phường An Bình", unitName: "Tổ 1", maxMembers: 10 }])).rejects.toThrow("Lỗi ghi dữ liệu giả lập");
    expect(state).toEqual([]);
  });

  it("writes a large catalog in batches instead of issuing one insert per row", async () => {
    const { executor, state, getInsertCount } = createTransactionExecutor();
    const rows = Array.from({ length: 260 }, (_, index) => ({ wardName: `Phường ${index + 1}`, unitName: `Tổ ${index + 1}`, maxMembers: 5 }));
    await expect(importUnitCatalogWithExecutor(executor, rows)).resolves.toEqual({ totalWards: 260, totalTeams: 260, removedWards: 0, removedUnits: 0 });
    expect(state).toHaveLength(520);
    expect(getInsertCount()).toBe(4);
  });

  it("does not depend on a per-row insertId result from batch inserts", async () => {
    const { executor, state } = createTransactionExecutor({ batchResultWithoutPerRowIds: true });
    await expect(importUnitCatalogWithExecutor(executor, [{ wardName: "Phường An Bình", unitName: "Tổ 1", maxMembers: 10 }, { wardName: "Phường An Bình", unitName: "Tổ 2", maxMembers: 12 }])).resolves.toEqual({ totalWards: 1, totalTeams: 2, removedWards: 0, removedUnits: 0 });
    expect(state.filter(item => item.unitType === "team").map(item => item.parentId)).toEqual([state.find(item => item.unitType === "ward")?.id, state.find(item => item.unitType === "ward")?.id]);
  });

  it("replaces obsolete wards and teams with the catalog in the file", async () => {
    const { executor, state } = createTransactionExecutor({ initialUnits: [
      { id: 2, code: "XP-0001", name: "Xã Cũ", unitType: "ward", parentId: null, maxMembers: 0, address: null, isActive: "active" },
      { id: 3, code: "TO-0001", name: "Tổ Cũ", unitType: "team", parentId: 2, maxMembers: 5, address: null, isActive: "active" },
    ] });
    await expect(importUnitCatalogWithExecutor(executor, [{ wardName: "Xã Mới", unitName: "Tổ Mới", maxMembers: 8 }])).resolves.toEqual({ totalWards: 1, totalTeams: 1, removedWards: 1, removedUnits: 1 });
    expect(state.map(item => item.name)).toEqual(["Xã Mới", "Tổ Mới"]);
  });

  it("refuses to remove a team that is still assigned to personnel", async () => {
    const initialUnits: StoredUnit[] = [
      { id: 2, code: "XP-0001", name: "Xã Cũ", unitType: "ward", parentId: null, maxMembers: 0, address: null, isActive: "active" },
      { id: 3, code: "TO-0001", name: "Tổ Cũ", unitType: "team", parentId: null, maxMembers: 5, address: null, isActive: "active" },
    ];
    const { executor, state } = createTransactionExecutor({ initialUnits, linkedPersonnel: 1 });
    await expect(importUnitCatalogWithExecutor(executor, [{ wardName: "Xã Mới", unitName: "Tổ Mới", maxMembers: 8 }])).rejects.toThrow("đang thuộc Tổ không có trong file Excel");
    expect(state).toEqual(initialUnits);
  });
});
