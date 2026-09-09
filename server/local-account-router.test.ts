import { describe, expect, it, vi } from "vitest";
import { hashLocalPassword } from "./local-auth";
import type { TrpcContext } from "./_core/context";

const state = vi.hoisted(() => ({
  account: null as any,
  createLocalUser: vi.fn(),
  resetLocalUserPassword: vi.fn(),
  completeLocalPasswordChange: vi.fn(),
  markLocalUserSignedIn: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const original = await importOriginal<typeof import("./db")>();
  return {
    ...original,
    getLocalUserByUsername: vi.fn(async () => state.account),
    createLocalUser: state.createLocalUser,
    resetLocalUserPassword: state.resetLocalUserPassword,
    completeLocalPasswordChange: state.completeLocalPasswordChange,
    markLocalUserSignedIn: state.markLocalUserSignedIn,
  };
});

const { appRouter } = await import("./routers");

function context(user: any): { ctx: TrpcContext; cookies: Array<{ name: string; value: string }> } {
  const cookies: Array<{ name: string; value: string }> = [];
  return { ctx: { user, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined, cookie: (name: string, value: string) => cookies.push({ name, value }) } as TrpcContext["res"] }, cookies };
}

function localUser(overrides: Record<string, unknown> = {}) {
  return { id: 811, openId: "local:canbo.test", name: "Cán bộ Test", email: null, loginMethod: "local", username: "canbo.test", passwordHash: null, mustChangePassword: true, passwordUpdatedAt: new Date(), role: "user", assignedWardId: 1, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), ...overrides };
}

describe("local account tRPC APIs", () => {
  it("creates a session after valid local credentials and flags the temporary password", async () => {
    const password = "MatKhauNoiBo#2026";
    state.account = localUser({ passwordHash: await hashLocalPassword(password) });
    const { ctx, cookies } = context(null);
    const result = await appRouter.createCaller(ctx).auth.localLogin({ username: "CANBO.TEST", password });
    expect(result).toEqual({ success: true, mustChangePassword: true });
    expect(state.markLocalUserSignedIn).toHaveBeenCalledWith(811);
    expect(cookies).toHaveLength(1);
    expect(cookies[0]?.name).toBe("app_session_id");
  });

  it("allows Admin to create and reset a local account without exposing a plain password", async () => {
    state.account = null;
    state.createLocalUser.mockResolvedValueOnce(812);
    state.resetLocalUserPassword.mockResolvedValueOnce(undefined);
    const { ctx } = context(localUser({ id: 1, openId: "admin", loginMethod: "manus", username: null, passwordHash: null, mustChangePassword: false, role: "admin", assignedWardId: null }));
    const caller = appRouter.createCaller(ctx);
    await expect(caller.users.createLocalAccount({ name: "Lãnh đạo Test", username: "lanhdao.test", password: "MatKhauNoiBo#2026", role: "leader", assignedWardId: null })).resolves.toBe(812);
    expect(state.createLocalUser).toHaveBeenCalledWith(expect.objectContaining({ username: "lanhdao.test", role: "leader", passwordHash: expect.not.stringContaining("MatKhauNoiBo#2026") }));
    await expect(caller.users.resetLocalPassword({ id: 812, password: "MatKhauMoi#2026" })).resolves.toEqual({ success: true });
    expect(state.resetLocalUserPassword).toHaveBeenCalledWith(812, expect.not.stringContaining("MatKhauMoi#2026"));
  });
});
