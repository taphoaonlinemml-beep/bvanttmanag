import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(role: "admin" | "leader" | "user", options: { loginMethod?: string | null; mustChangePassword?: boolean; adminPermissions?: string | null } = {}): TrpcContext {
  return {
    user: { id: 701, openId: "local:test", name: "Tài khoản kiểm thử", email: null, loginMethod: options.loginMethod ?? "local", username: "test.account", passwordHash: "scrypt$16384$8$1$MDEyMzQ1Njc4OWFiY2RlZg$MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY", mustChangePassword: options.mustChangePassword ?? false, passwordUpdatedAt: new Date(), role, assignedWardId: role === "user" ? 1 : null, adminPermissions: options.adminPermissions ?? null, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined, cookie: () => undefined } as TrpcContext["res"],
  };
}

describe("local account administration and temporary password guard", () => {
  it("blocks every protected business procedure until a local user changes the temporary password", async () => {
    const caller = appRouter.createCaller(context("user", { mustChangePassword: true }));
    await expect(caller.personnel.list()).rejects.toMatchObject({ code: "FORBIDDEN", message: "Vui lòng đổi mật khẩu tạm trước khi sử dụng hệ thống" });
  });

  it("allows only Admin to create or reset internal account passwords", async () => {
    const leader = appRouter.createCaller(context("leader", { loginMethod: "manus" }));
    await expect(leader.users.createLocalAccount({ name: "Cán bộ A", username: "canbo.a", password: "MatKhauNoiBo#2026", role: "leader", assignedWardId: null })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(leader.users.resetLocalPassword({ id: 701, password: "MatKhauMoi#2026" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(leader.users.exportAccounts()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows a delegated Leader to manage ward Users but never elevate Admin or Leader accounts", async () => {
    const leader = appRouter.createCaller(context("leader", { loginMethod: "manus", adminPermissions: JSON.stringify(["manageAccounts"]) }));
    await expect(leader.users.updateAccess({ id: 702, role: "user", assignedWardId: null })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(leader.users.updateAccess({ id: 702, role: "leader", assignedWardId: null })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("also blocks delegated administrative procedures until a local account changes its temporary password", async () => {
    const leader = appRouter.createCaller(context("leader", { mustChangePassword: true, adminPermissions: JSON.stringify(["manageAccounts"]) }));
    await expect(leader.users.list()).rejects.toMatchObject({ code: "FORBIDDEN", message: "Vui lòng đổi mật khẩu tạm trước khi sử dụng hệ thống" });
  });
});
