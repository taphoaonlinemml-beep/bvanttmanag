import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { units } from "../drizzle/schema";
import * as db from "./db";

const runRealDb = process.env.RUN_REAL_DB_TESTS === "1" ? describe : describe.skip;
let createdPersonnelId: number | null = null;

runRealDb("personnel date of birth before 1970", () => {
  afterAll(async () => {
    if (createdPersonnelId) await db.removePersonnel([createdPersonnelId]);
  });

  it("persists a 1965 date of birth without timestamp range failure", async () => {
    const database = await db.getDb();
    if (!database) throw new Error("Không thể kết nối cơ sở dữ liệu kiểm thử");
    const team = (await database.select({ id: units.id }).from(units).where(eq(units.unitType, "team")).limit(1))[0];
    if (!team) throw new Error("Không có Tổ để tạo hồ sơ kiểm thử");
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    createdPersonnelId = await db.createPersonnel({
      fullName: `__TEST_PRE1970__ ${suffix}`,
      unitId: team.id,
      dateOfBirth: new Date(Date.UTC(1965, 0, 1)),
      gender: null,
      citizenId: null,
      phone: null,
      address: null,
      village: null,
      ethnicity: null,
      religion: null,
      educationLevel: null,
      position: null,
      joinedFormerForceAt: null,
      joinedAt: null,
      leftFormerForceAt: null,
      leftAt: null,
      policyResult: null,
      certificateNumber: null,
      commendation: null,
      classification: null,
      classificationDecision: null,
      notes: "Bản ghi kiểm thử tự dọn dẹp",
    }, "active");
    const saved = await db.getPersonnelDetail(createdPersonnelId);
    expect(saved?.personnel.dateOfBirth?.getUTCFullYear()).toBe(1965);
  }, 15_000);
});
