import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import { createMobileSyncRouter } from "./mobile-sync";

const servers: Array<ReturnType<ReturnType<typeof express>["listen"]>> = [];

async function request(path: string, token?: string) {
  const app = express();
  app.use("/api/mobile-sync", createMobileSyncRouter({ findActiveToken: async raw => raw === "active-token" ? ({ id: 9, wardId: null } as any) : null, touchToken: async () => undefined, getSnapshot: async () => ({ units: [], personnel: [] }), createLog: async () => undefined }));
  const server = app.listen(0);
  servers.push(server);
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Không lấy được cổng kiểm thử Mobile Sync");
  return fetch(`http://127.0.0.1:${address.port}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
}

afterEach(async () => { await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => server.close(() => resolve())))); });

describe("Mobile Sync Bearer authentication", () => {
  it("xác thực health bằng token động và từ chối token thiếu hoặc đã thu hồi", async () => {
    const authorized = await request("/api/mobile-sync/v1/health", "active-token");
    expect(authorized.status).toBe(200);
    await expect(authorized.json()).resolves.toEqual({ status: "ok" });
    const unauthorized = await request("/api/mobile-sync/v1/health", "revoked-token");
    expect(unauthorized.status).toBe(401);
    await expect(unauthorized.json()).resolves.toEqual({ error: "unauthorized" });
  });
});
