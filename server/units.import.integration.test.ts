import * as XLSX from "xlsx";
import { describe, expect, it, vi } from "vitest";

const listUnits = vi.hoisted(() => vi.fn());
const fixture = vi.hoisted(() => {
  type StoredUnit = { id: number; code: string; name: string; unitType: string; parentId: number | null; maxMembers: number; address: string | null; isActive: string };
  const state: StoredUnit[] = [];
  let nextId = 1;
  const reset = () => { state.splice(0, state.length); nextId = 1; };
  const executor = {
    async transaction<T>(callback: (tx: any) => Promise<T>) {
      const snapshot = state.map(unit => ({ ...unit }));
      const snapshotId = nextId;
      try {
        return await callback({
          select: () => ({ from: async () => state.map(({ id, code, name, unitType, parentId }) => ({ id, code, name, unitType, parentId })) }),
          insert: () => ({ values: async (value: Omit<StoredUnit, "id"> | Array<Omit<StoredUnit, "id">>) => {
            const values = Array.isArray(value) ? value : [value];
            values.forEach(unit => { nextId += 1; state.push({ id: nextId, ...unit }); });
            return [{ insertId: state.at(-1)?.id }];
          } }),
        });
      } catch (error) {
        state.splice(0, state.length, ...snapshot);
        nextId = snapshotId;
        throw error;
      }
    },
  };
  return { state, executor, reset };
});

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    listUnits,
    importUnitCatalog: (rows: Parameters<typeof actual.importUnitCatalogWithExecutor>[1]) => actual.importUnitCatalogWithExecutor(fixture.executor, rows),
  };
});

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function adminContext(): TrpcContext {
  return { user: { id: 1, openId: "integration-admin", name: "Admin", email: "admin@example.com", loginMethod: "manus", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] };
}

describe("units.importCatalog integration", () => {
  it("creates a new ward and teams through tRPC without relying on per-row insertId values", async () => {
    fixture.reset();
    listUnits.mockResolvedValue([]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
      { "Tên xã, phường": "Xã Liên Kết Mới", "Tên đơn vị/tổ": "Tổ 1", "Số lượng thành viên tối đa": 8 },
      { "Tên xã, phường": "Xã Liên Kết Mới", "Tên đơn vị/tổ": "Tổ 2", "Số lượng thành viên tối đa": 10 },
    ]), "DanhMucDonVi");
    const base64 = XLSX.write(workbook, { bookType: "xlsx", type: "base64" });
    const caller = appRouter.createCaller(adminContext());
    await expect(caller.units.importCatalog({ base64 })).resolves.toEqual({ totalWards: 1, totalTeams: 2, removedWards: 0, removedUnits: 0, errors: [] });
    const ward = fixture.state.find(unit => unit.unitType === "ward");
    expect(ward?.name).toBe("Xã Liên Kết Mới");
    expect(fixture.state.filter(unit => unit.unitType === "team").map(unit => unit.parentId)).toEqual([ward?.id, ward?.id]);
  });
});
