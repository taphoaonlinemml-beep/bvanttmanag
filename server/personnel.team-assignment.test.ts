import { describe, expect, it, vi } from "vitest";

const listUnits = vi.hoisted(() => vi.fn());
const createPersonnel = vi.hoisted(() => vi.fn());
const transferPersonnelUnit = vi.hoisted(() => vi.fn());

vi.mock("./db", () => ({
  listUnits,
  createPersonnel,
  transferPersonnelUnit,
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function adminContext(): TrpcContext {
  return { user: { id: 1, openId: "team-admin", name: "Admin", email: "admin@example.com", loginMethod: "manus", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] };
}

const personnelPayload = { fullName: "Nguyễn Văn A", unitId: 2 };

describe("personnel team assignment", () => {
  it("rejects creating a personnel record in a non-team unit", async () => {
    listUnits.mockResolvedValueOnce([{ id: 1, name: "Phường An Bình", unitType: "ward" }]);
    const caller = appRouter.createCaller(adminContext());
    await expect(caller.personnel.create({ ...personnelPayload, unitId: 1 })).rejects.toMatchObject({ code: "BAD_REQUEST", message: "Hồ sơ nhân sự phải được gắn vào một Tổ hợp lệ" });
  });

  it("creates and transfers personnel only to a team", async () => {
    listUnits.mockResolvedValue([{ id: 1, name: "Phường An Bình", unitType: "ward" }, { id: 2, name: "Tổ 1", unitType: "team" }]);
    createPersonnel.mockResolvedValueOnce(101);
    transferPersonnelUnit.mockResolvedValueOnce(3);
    const caller = appRouter.createCaller(adminContext());
    await expect(caller.personnel.create(personnelPayload)).resolves.toBe(101);
    await expect(caller.personnel.transferUnit({ fromUnitId: 1, toUnitId: 2 })).resolves.toEqual({ moved: 3 });
  });
});
