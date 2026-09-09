import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function adminContext(): TrpcContext {
  return {
    user: { id: 1, openId: "admin-user", name: "Admin", email: "admin@example.com", loginMethod: "manus", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

function roleContext(role: "leader" | "user", assignedWardId: number | null = null): TrpcContext {
  return {
    user: { id: 2, openId: `${role}-user`, name: role, email: `${role}@example.com`, loginMethod: "manus", role, assignedWardId, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("users.updateRole", () => {
  it("rejects an attempt by the current administrator to remove their own admin role", async () => {
    const caller = appRouter.createCaller(adminContext());
    await expect(caller.users.updateRole({ id: 1, role: "user" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("does not allow a Leader account to create personnel", async () => {
    const caller = appRouter.createCaller(roleContext("leader"));
    await expect(caller.personnel.create({ fullName: "Nguyễn Văn A", unitId: 1, dateOfBirth: null, gender: null, citizenId: null, phone: null, address: null, village: null, ethnicity: null, religion: null, educationLevel: null, position: null, joinedFormerForceAt: null, joinedAt: null, leftFormerForceAt: null, leftAt: null, policyResult: null, certificateNumber: null, commendation: null, classification: null, classificationDecision: null, notes: null })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("does not allow a ward User to delete personnel and requires ward assignment before data access", async () => {
    const caller = appRouter.createCaller(roleContext("user"));
    await expect(caller.personnel.remove({ ids: [1] })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.personnel.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("limits ward User filters and exports to the assigned ward", async () => {
    const caller = appRouter.createCaller(roleContext("user", 10));
    await expect(caller.personnel.list({ wardId: 11 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.excel.exportPersonnel({ wardId: 11 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.excel.exportPersonnel({ wardIds: [10, 11] })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.excel.exportPersonnel()).resolves.toMatchObject({ filename: "danh-sach-luc-luong-antt.xlsx" });
    await expect(caller.excel.exportPersonnel({ wardId: 10 })).resolves.toMatchObject({ filename: "danh-sach-luc-luong-antt.xlsx" });
  }, 30000);

  it("allows Admin and Leader to export data for multiple selected wards or all wards", async () => {
    const leader = appRouter.createCaller(roleContext("leader"));
    const admin = appRouter.createCaller(adminContext());
    await expect(leader.excel.exportPersonnel({ wardIds: [10] })).resolves.toMatchObject({ filename: "danh-sach-luc-luong-antt.xlsx" });
    await expect(admin.excel.exportPersonnel({ wardIds: [10] })).resolves.toMatchObject({ filename: "danh-sach-luc-luong-antt.xlsx" });
    await expect(leader.excel.exportPersonnel({ wardIds: [10, 11] })).resolves.toMatchObject({ filename: "danh-sach-luc-luong-antt.xlsx" });
    await expect(admin.excel.exportPersonnel({ wardIds: [10, 11] })).resolves.toMatchObject({ filename: "danh-sach-luc-luong-antt.xlsx" });
    await expect(leader.excel.exportPersonnel()).resolves.toMatchObject({ filename: "danh-sach-luc-luong-antt.xlsx" });
  });

  it("limits BM1 reports to an assigned ward User and requires Admin or Leader to select wards", async () => {
    const wardUser = appRouter.createCaller(roleContext("user", 10));
    const leader = appRouter.createCaller(roleContext("leader"));
    const admin = appRouter.createCaller(adminContext());
    await expect(wardUser.excel.exportStatisticsReport({ wardIds: [11] })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(wardUser.excel.exportStatisticsReport()).resolves.toMatchObject({ filename: "bieu-mau-01-thong-ke-luc-luong-antt.xlsx" });
    await expect(leader.excel.exportStatisticsReport()).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(admin.excel.exportStatisticsReport({ wardIds: [10] })).resolves.toMatchObject({ filename: "bieu-mau-01-thong-ke-luc-luong-antt.xlsx" });
    await expect(leader.excel.exportStatisticsReport({ wardIds: [10, 11], periodMode: "custom", startDate: "2026-01-01", endDate: "2026-01-31" })).resolves.toMatchObject({ filename: "bieu-mau-01-thong-ke-luc-luong-antt.xlsx" });
  }, 30000);

  it("requires an Admin to assign exactly one ward before setting a ward User role", async () => {
    const caller = appRouter.createCaller(adminContext());
    await expect(caller.users.updateAccess({ id: 2, role: "user", assignedWardId: null })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.users.updateRole({ id: 2, role: "user", assignedWardId: null })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("limits deletion requests to assigned ward Users and blocks Leaders", async () => {
    const leader = appRouter.createCaller(roleContext("leader"));
    const unassignedWardUser = appRouter.createCaller(roleContext("user"));
    await expect(leader.deletionRequests.create({ personnelId: 1, reason: "Hồ sơ được tạo nhầm trong quá trình nhập liệu." })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(unassignedWardUser.deletionRequests.create({ personnelId: 1, reason: "Hồ sơ được tạo nhầm trong quá trình nhập liệu." })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
