import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  personnel: [{ id: 101, fullName: "Hồ sơ kiểm thử", unitId: 201, wardId: 99 }],
  requests: [] as Array<{ id: number; personnelId: number | null; personnelName: string; reason: string; requesterUserId: number; status: "pending" | "rejected" | "executed"; reviewerUserId: number | null; reviewedAt: Date | null; executedAt: Date | null; decisionNote: string | null }>,
  evidenceFiles: [] as Array<{ id: number; deletionRequestId: number; originalName: string; storageKey: string; storageUrl: string; mimeType: string }>,
  nextId: 1,
}));

const getPersonnelDetail = vi.hoisted(() => vi.fn());
const createDeletionRequest = vi.hoisted(() => vi.fn());
const listDeletionRequests = vi.hoisted(() => vi.fn());
const rejectDeletionRequest = vi.hoisted(() => vi.fn());
const executeDeletionRequest = vi.hoisted(() => vi.fn());
const getDeletionRequestForRequester = vi.hoisted(() => vi.fn());
const addDeletionRequestFile = vi.hoisted(() => vi.fn());
const storagePut = vi.hoisted(() => vi.fn());

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, getPersonnelDetail, createDeletionRequest, listDeletionRequests, rejectDeletionRequest, executeDeletionRequest, getDeletionRequestForRequester, addDeletionRequestFile };
});
vi.mock("./storage", () => ({ storagePut }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(role: "admin" | "user", assignedWardId: number | null = null): TrpcContext {
  return { user: { id: role === "admin" ? 1 : 2, openId: `${role}-deletion-test`, name: role, email: `${role}@example.com`, loginMethod: "manus", role, assignedWardId, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] };
}

function configureDb() {
  state.personnel.splice(0, state.personnel.length, { id: 101, fullName: "Hồ sơ kiểm thử", unitId: 201, wardId: 99 });
  state.requests.splice(0, state.requests.length);
  state.evidenceFiles.splice(0, state.evidenceFiles.length);
  state.nextId = 1;
  getPersonnelDetail.mockImplementation(async (id: number, wardId?: number | null) => {
    const record = state.personnel.find(item => item.id === id && (!wardId || item.wardId === wardId));
    return record ? { personnel: { id: record.id, fullName: record.fullName, unitId: record.unitId }, files: [] } : undefined;
  });
  createDeletionRequest.mockImplementation(async (input: { personnelId: number; personnelName: string; reason: string; requesterUserId: number }) => {
    if (state.requests.some(request => request.personnelId === input.personnelId && request.status === "pending")) throw new Error("Hồ sơ này đã có yêu cầu xóa đang chờ Admin xem xét");
    const id = state.nextId++;
    state.requests.push({ id, ...input, status: "pending", reviewerUserId: null, reviewedAt: null, executedAt: null, decisionNote: null });
    return id;
  });
  listDeletionRequests.mockImplementation(async () => state.requests);
  getDeletionRequestForRequester.mockImplementation(async (id: number, requesterUserId: number) => state.requests.find(request => request.id === id && request.requesterUserId === requesterUserId));
  addDeletionRequestFile.mockImplementation(async (input: { deletionRequestId: number; originalName: string; storageKey: string; storageUrl: string; mimeType: string }) => { const id = state.nextId++; state.evidenceFiles.push({ id, ...input }); return id; });
  storagePut.mockImplementation(async (key: string) => ({ key, url: `/manus-storage/${key}` }));
  rejectDeletionRequest.mockImplementation(async (id: number, reviewerUserId: number, decisionNote: string | null) => {
    const request = state.requests.find(item => item.id === id && item.status === "pending");
    if (!request) throw new Error("Yêu cầu không còn ở trạng thái chờ xử lý");
    request.status = "rejected"; request.reviewerUserId = reviewerUserId; request.reviewedAt = new Date(); request.decisionNote = decisionNote;
  });
  executeDeletionRequest.mockImplementation(async (id: number, reviewerUserId: number, decisionNote: string | null) => {
    const request = state.requests.find(item => item.id === id && item.status === "pending");
    if (!request) throw new Error("Yêu cầu không còn ở trạng thái chờ xử lý");
    const personnelIndex = state.personnel.findIndex(item => item.id === request.personnelId);
    if (personnelIndex >= 0) state.personnel.splice(personnelIndex, 1);
    request.status = "executed"; request.reviewerUserId = reviewerUserId; request.reviewedAt = new Date(); request.executedAt = new Date(); request.decisionNote = decisionNote; request.personnelId = null;
    return { personnelDeleted: personnelIndex >= 0 };
  });
}

describe("deletionRequests tRPC workflow", () => {
  it("creates, blocks duplicate pending requests, rejects, and executes deletion with audit fields", async () => {
    configureDb();
    const wardUser = appRouter.createCaller(context("user", 99));
    const admin = appRouter.createCaller(context("admin"));
    const firstId = await wardUser.deletionRequests.create({ personnelId: 101, reason: "Hồ sơ bị nhập trùng trong đợt rà soát danh sách." });
    expect(state.requests[0]).toMatchObject({ id: firstId, status: "pending", requesterUserId: 2, personnelName: "Hồ sơ kiểm thử" });
    await wardUser.deletionRequests.uploadEvidence({ deletionRequestId: firstId, originalName: "minh-chung.pdf", mimeType: "application/pdf", base64: "a".repeat(32) });
    expect(state.evidenceFiles[0]).toMatchObject({ deletionRequestId: firstId, originalName: "minh-chung.pdf", storageUrl: expect.stringContaining("deletion-requests") });
    await expect(wardUser.deletionRequests.create({ personnelId: 101, reason: "Tạo thêm yêu cầu khi hồ sơ đang chờ xử lý." })).rejects.toThrow("đã có yêu cầu xóa");

    await admin.deletionRequests.reject({ id: firstId, decisionNote: "Cần rà soát lại hồ sơ gốc" });
    expect(state.requests[0]).toMatchObject({ status: "rejected", reviewerUserId: 1, decisionNote: "Cần rà soát lại hồ sơ gốc" });
    expect(state.requests[0].reviewedAt).toBeInstanceOf(Date);

    const secondId = await wardUser.deletionRequests.create({ personnelId: 101, reason: "Đã đối chiếu, xác nhận hồ sơ trùng cần được xóa." });
    await expect(admin.deletionRequests.execute({ id: secondId, decisionNote: "Đã kiểm tra và thực hiện xóa" })).resolves.toEqual({ personnelDeleted: true });
    const executed = state.requests.find(request => request.id === secondId)!;
    expect(executed).toMatchObject({ status: "executed", personnelId: null, reviewerUserId: 1, decisionNote: "Đã kiểm tra và thực hiện xóa" });
    expect(executed.reviewedAt).toBeInstanceOf(Date);
    expect(executed.executedAt).toBeInstanceOf(Date);
    expect(state.personnel).toHaveLength(0);
  });

  it("blocks evidence uploads outside ward User permission and file safety rules", async () => {
    configureDb();
    const admin = appRouter.createCaller(context("admin"));
    const leader = appRouter.createCaller({ ...context("user", 99), user: { ...context("user", 99).user!, id: 3, role: "leader" } });
    const unassignedWardUser = appRouter.createCaller(context("user"));
    const wardUser = appRouter.createCaller(context("user", 99));
    const validInput = { deletionRequestId: 1, originalName: "minh-chung.pdf", mimeType: "application/pdf", base64: "a".repeat(32) };
    await expect(admin.deletionRequests.uploadEvidence(validInput)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(leader.deletionRequests.uploadEvidence(validInput)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(unassignedWardUser.deletionRequests.uploadEvidence(validInput)).rejects.toMatchObject({ code: "FORBIDDEN" });

    const requestId = await wardUser.deletionRequests.create({ personnelId: 101, reason: "Cần tải minh chứng để rà soát yêu cầu xóa hồ sơ." });
    await expect(wardUser.deletionRequests.uploadEvidence({ ...validInput, deletionRequestId: requestId, mimeType: "text/plain", originalName: "khong-hop-le.txt" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(wardUser.deletionRequests.uploadEvidence({ ...validInput, deletionRequestId: requestId, base64: "a".repeat(14_000_000), originalName: "qua-dung-luong.pdf" })).rejects.toMatchObject({ code: "PAYLOAD_TOO_LARGE" });
  });
});
