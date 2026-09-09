import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import { createMobileSyncRouter } from "./mobile-sync";

const servers: Array<ReturnType<ReturnType<typeof express>["listen"]>> = [];
type MockToken = { id: number; wardId: number | null };

async function request(path: string, bearerToken: string | null, tokens: Record<string, MockToken> = {}) {
  const requestedWards: Array<number | null> = [];
  const usedTokenIds: number[] = [];
  const logs: Array<{ statusCode: number; wardId: number | null; personnelCount: number; unitCount: number; errorCode?: string | null }> = [];
  const app = express();
  app.use("/api/mobile-sync", createMobileSyncRouter({
    findActiveToken: async raw => tokens[raw] as any ?? null,
    touchToken: async id => { usedTokenIds.push(id); },
    getSnapshot: async wardId => { requestedWards.push(wardId); return { units: [{ id: wardId ?? 1, name: "Xã kiểm thử", type: "ward" as const, parentId: null, capacity: 5 }], personnel: [{ id: 7, fullName: "Nguyễn Văn A", unitId: 99 }] }; },
    createLog: async log => { logs.push(log); },
  }));
  const server = app.listen(0);
  servers.push(server);
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Không lấy được cổng kiểm thử");
  return { response: await fetch(`http://127.0.0.1:${address.port}${path}`, { headers: bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {} }), requestedWards, usedTokenIds, logs };
}

afterEach(async () => { await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => server.close(() => resolve())))); });

describe("GET /api/mobile-sync/v1/personnel snapshot", () => {
  it("trả 401 cho Bearer thiếu, sai hoặc token đã thu hồi", async () => {
    const missing = await request("/api/mobile-sync/v1/personnel", null, { "active-token": { id: 1, wardId: null } });
    expect(missing.response.status).toBe(401);
    await expect(missing.response.json()).resolves.toEqual({ error: "unauthorized" });
    const invalid = await request("/api/mobile-sync/v1/personnel", "revoked-token", { "active-token": { id: 1, wardId: null } });
    expect(invalid.response.status).toBe(401);
    await expect(invalid.response.json()).resolves.toEqual({ error: "unauthorized" });
  });

  it("chặn token xã/phường truy cập địa bàn khác", async () => {
    const result = await request("/api/mobile-sync/v1/personnel?wardId=12", "ward-token", { "ward-token": { id: 2, wardId: 11 } });
    expect(result.response.status).toBe(403);
    await expect(result.response.json()).resolves.toEqual({ error: "forbidden" });
    expect(result.requestedWards).toEqual([]);
    expect(result.logs).toMatchObject([{ statusCode: 403, wardId: 11, errorCode: "forbidden" }]);
  });

  it("trả snapshot chỉ thuộc xã/phường gắn với token", async () => {
    const result = await request("/api/mobile-sync/v1/personnel", "ward-token", { "ward-token": { id: 2, wardId: 11 } });
    expect(result.response.status).toBe(200);
    const payload = await result.response.json();
    expect(payload).toMatchObject({ version: 1, units: [{ id: 11 }], personnel: [{ id: 7, fullName: "Nguyễn Văn A" }] });
    expect(new Date(payload.generatedAt).toISOString()).toBe(payload.generatedAt);
    expect(result.requestedWards).toEqual([11]);
    expect(result.usedTokenIds).toEqual([2]);
    expect(result.logs).toMatchObject([{ statusCode: 200, wardId: 11, unitCount: 1, personnelCount: 1 }]);
  });

  it("cho phép token toàn tỉnh lấy toàn bộ hoặc một xã/phường chỉ định", async () => {
    const all = await request("/api/mobile-sync/v1/personnel", "province-token", { "province-token": { id: 3, wardId: null } });
    expect(all.response.status).toBe(200);
    expect(all.requestedWards).toEqual([null]);
    const scoped = await request("/api/mobile-sync/v1/personnel?wardId=12", "province-token", { "province-token": { id: 3, wardId: null } });
    expect(scoped.response.status).toBe(200);
    expect(scoped.requestedWards).toEqual([12]);
  });
});
