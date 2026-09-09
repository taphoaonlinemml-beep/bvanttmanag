import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  units: [{ id: 1, name: "Phường An Bình", unitType: "ward", parentId: null, maxMembers: 0 }, { id: 2, name: "Tổ 1", unitType: "team", parentId: 1, maxMembers: 2 }, { id: 3, name: "Tổ 2", unitType: "team", parentId: 1, maxMembers: 1 }],
  personnel: [] as Array<{ id: number; fullName: string; unitId: number; status: "active" | "inactive" }>,
  nextId: 1,
  executor: null as any,
}));

const listUnits = vi.hoisted(() => vi.fn());
const createPersonnel = vi.hoisted(() => vi.fn());
const updatePersonnel = vi.hoisted(() => vi.fn());
const removePersonnel = vi.hoisted(() => vi.fn());
const transferPersonnelUnit = vi.hoisted(() => vi.fn());

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, listUnits, createPersonnel, updatePersonnel, removePersonnel, transferPersonnelUnit, getTeamStaffing: () => actual.getTeamStaffingWithExecutor(state.executor) };
});

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function adminContext(): TrpcContext {
  return { user: { id: 1, openId: "staffing-admin", name: "Admin", email: "admin@example.com", loginMethod: "manus", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] };
}

function setExecutor() {
  state.executor = { select: () => ({ from: () => ({ orderBy: async () => state.units, groupBy: async () => {
    const grouped = new Map<number, number>();
    state.personnel.filter(record => record.status === "active").forEach(record => grouped.set(record.unitId, (grouped.get(record.unitId) ?? 0) + 1));
    return [...grouped.entries()].map(([unitId, currentMembers]) => ({ unitId, currentMembers }));
  } }) }) };
}

describe("personnel mutations update units.staffing", () => {
  it("returns staffing from the real statistics implementation after create, update, transfer and remove", async () => {
    state.personnel.splice(0, state.personnel.length);
    state.nextId = 1;
    setExecutor();
    listUnits.mockResolvedValue(state.units);
    createPersonnel.mockImplementation(async (payload, status) => { const id = state.nextId++; state.personnel.push({ id, fullName: payload.fullName, unitId: payload.unitId, status }); return id; });
    updatePersonnel.mockImplementation(async (id, payload, status) => { const record = state.personnel.find(item => item.id === id)!; record.fullName = payload.fullName; record.unitId = payload.unitId; record.status = status; });
    removePersonnel.mockImplementation(async (ids) => { const retained = state.personnel.filter(item => !ids.includes(item.id)); state.personnel.splice(0, state.personnel.length, ...retained); });
    transferPersonnelUnit.mockImplementation(async (fromUnitId, toUnitId) => { let moved = 0; state.personnel.forEach(record => { if (record.unitId === fromUnitId) { record.unitId = toUnitId; moved += 1; } }); return moved; });

    const caller = appRouter.createCaller(adminContext());
    const firstId = await caller.personnel.create({ fullName: "Nguyễn Văn A", unitId: 2 });
    const secondId = await caller.personnel.create({ fullName: "Nguyễn Văn B", unitId: 2 });
    expect(await caller.units.staffing()).toEqual(expect.arrayContaining([expect.objectContaining({ teamId: 2, currentMembers: 2, availableMembers: 0 })]));

    await caller.personnel.update({ id: secondId, payload: { fullName: "Nguyễn Văn B", unitId: 2, leftAt: new Date() } });
    expect(await caller.units.staffing()).toEqual(expect.arrayContaining([expect.objectContaining({ teamId: 2, currentMembers: 1, availableMembers: 1 })]));

    await caller.personnel.transferUnit({ fromUnitId: 2, toUnitId: 3 });
    expect(await caller.units.staffing()).toEqual(expect.arrayContaining([expect.objectContaining({ teamId: 2, currentMembers: 0 }), expect.objectContaining({ teamId: 3, currentMembers: 1, availableMembers: 0 })]));

    await caller.personnel.remove({ ids: [firstId] });
    expect(await caller.units.staffing()).toEqual(expect.arrayContaining([expect.objectContaining({ teamId: 3, currentMembers: 0, availableMembers: 1 })]));
  });
});
