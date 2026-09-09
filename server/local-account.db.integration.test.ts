import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { users } from "../drizzle/schema";
import { hashLocalPassword } from "./local-auth";
import * as db from "./db";

const runRealDb = process.env.RUN_REAL_DB_TESTS === "1" ? describe : describe.skip;
let username: string | null = null;

runRealDb("local account database persistence", () => {
  afterAll(async () => {
    if (!username) return;
    const database = await db.getDb();
    if (database) await database.delete(users).where(eq(users.username, username));
  });

  it("creates a Leader account without writing the invalid Unix epoch timestamp", async () => {
    username = `test.local.${Date.now().toString(36)}`;
    const id = await db.createLocalUser({
      name: "__TEST_LOCAL_ACCOUNT__",
      username,
      passwordHash: await hashLocalPassword("MatKhauNoiBo#2026"),
      role: "leader",
      assignedWardId: null,
    });
    const saved = await db.getLocalUserByUsername(username);
    expect(id).toBeGreaterThan(0);
    expect(saved).toMatchObject({ id, username, role: "leader", loginMethod: "local", mustChangePassword: true });
    expect(saved?.lastSignedIn?.getTime()).toBeGreaterThan(Date.UTC(2020, 0, 1));
  }, 15_000);
});
