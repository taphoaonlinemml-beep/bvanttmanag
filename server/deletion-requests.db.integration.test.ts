import { inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { deletionRequests, units } from "../drizzle/schema";
import * as db from "./db";

const runRealDb = process.env.RUN_REAL_DB_TESTS === "1" ? describe : describe.skip;
const createdRequestIds: number[] = [];
let createdPersonnelId: number | null = null;

runRealDb("deletion requests real database integration", () => {
  afterAll(async () => {
    const database = await db.getDb();
    if (database && createdRequestIds.length) await database.delete(deletionRequests).where(inArray(deletionRequests.id, createdRequestIds));
    if (createdPersonnelId) await db.removePersonnel([createdPersonnelId]);
  });

  it("persists pending/rejected/executed audits and deletes the approved personnel record", async () => {
    const database = await db.getDb();
    if (!database) throw new Error("Không thể kết nối cơ sở dữ liệu kiểm thử");
    const team = (await database.select({ id: units.id }).from(units).where(inArray(units.unitType, ["team"])).limit(1))[0];
    if (!team) throw new Error("Không có Tổ để tạo hồ sơ kiểm thử");

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    createdPersonnelId = await db.createPersonnel({ fullName: `__TEST_DELETE_REQUEST__ ${suffix}`, unitId: team.id, dateOfBirth: null, gender: null, citizenId: null, phone: null, address: null, village: null, ethnicity: null, religion: null, educationLevel: null, position: null, joinedFormerForceAt: null, joinedAt: null, leftFormerForceAt: null, leftAt: null, policyResult: null, certificateNumber: null, commendation: null, classification: null, classificationDecision: null, notes: "Bản ghi kiểm thử tự dọn dẹp" }, "active");

    const rejectedId = await db.createDeletionRequest({ personnelId: createdPersonnelId, personnelName: `__TEST_DELETE_REQUEST__ ${suffix}`, reason: "Kiểm thử yêu cầu xóa có lý do hợp lệ.", requesterUserId: 1 });
    createdRequestIds.push(rejectedId);
    await db.addDeletionRequestFile({ deletionRequestId: rejectedId, originalName: "minh-chung-kiem-thu.pdf", storageKey: `test/${suffix}.pdf`, storageUrl: `/manus-storage/test/${suffix}.pdf`, mimeType: "application/pdf" });
    await expect(db.createDeletionRequest({ personnelId: createdPersonnelId, personnelName: `__TEST_DELETE_REQUEST__ ${suffix}`, reason: "Kiểm thử yêu cầu trùng đang chờ xử lý.", requesterUserId: 1 })).rejects.toThrow("đã có yêu cầu xóa");
    await db.rejectDeletionRequest(rejectedId, 1, "Đã kiểm tra, chưa xóa");
    const rejected = (await db.listDeletionRequests()).find(item => item.id === rejectedId)!;
    expect(rejected).toMatchObject({ status: "rejected", reviewerUserId: 1, decisionNote: "Đã kiểm tra, chưa xóa" });
    expect(rejected.reviewedAt).toBeInstanceOf(Date);
    expect(rejected.files).toEqual([expect.objectContaining({ originalName: "minh-chung-kiem-thu.pdf", mimeType: "application/pdf" })]);

    const executedId = await db.createDeletionRequest({ personnelId: createdPersonnelId, personnelName: `__TEST_DELETE_REQUEST__ ${suffix}`, reason: "Kiểm thử thực hiện xóa hồ sơ sau xét duyệt.", requesterUserId: 1 });
    createdRequestIds.push(executedId);
    await expect(db.executeDeletionRequest(executedId, 1, "Đã kiểm tra và thực hiện xóa")).resolves.toEqual({ personnelDeleted: true });
    const executed = (await db.listDeletionRequests()).find(item => item.id === executedId)!;
    expect(executed).toMatchObject({ status: "executed", personnelId: null, reviewerUserId: 1, decisionNote: "Đã kiểm tra và thực hiện xóa" });
    expect(executed.reviewedAt).toBeInstanceOf(Date);
    expect(executed.executedAt).toBeInstanceOf(Date);
    expect(await db.getPersonnelDetail(createdPersonnelId)).toBeUndefined();
    createdPersonnelId = null;
  }, 15_000);
});
