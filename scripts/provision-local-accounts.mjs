import { asc, eq, inArray } from "drizzle-orm";
import { units, users } from "../drizzle/schema.ts";
import { getDb } from "../server/db.ts";
import { hashLocalPassword } from "../server/local-auth.ts";

const password = process.env.INITIAL_LOCAL_PASSWORD;
if (!password || password.length < 8) throw new Error("Cần đặt biến INITIAL_LOCAL_PASSWORD có ít nhất 8 ký tự.");

const slugify = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const database = await getDb();
if (!database) throw new Error("Không thể kết nối cơ sở dữ liệu.");

const wards = await database.select({ id: units.id, name: units.name }).from(units).where(eq(units.unitType, "ward")).orderBy(asc(units.name));
if (wards.length !== 135) throw new Error(`Danh mục hiện có ${wards.length} xã/phường, không đúng 135; dừng để bảo vệ dữ liệu.`);

const requested = [
  ...wards.map(ward => ({ name: `Công an ${ward.name}`, username: `canbo.${slugify(ward.name)}`, role: "user", assignedWardId: ward.id })),
  ...Array.from({ length: 9 }, (_, offset) => ({ name: "Công an tỉnh", username: `canbo.ld${String(offset + 2).padStart(2, "0")}`, role: "leader", assignedWardId: null })),
];
const duplicateNames = requested.filter((account, index) => requested.findIndex(candidate => candidate.username === account.username) !== index).map(account => account.username);
if (duplicateNames.length) throw new Error(`Tên đăng nhập bị trùng theo quy ước: ${Array.from(new Set(duplicateNames)).join(", ")}`);

const existing = await database.select({ username: users.username }).from(users).where(inArray(users.username, requested.map(account => account.username)));
const existingUsernames = new Set(existing.map(account => account.username).filter(Boolean));
const pending = requested.filter(account => !existingUsernames.has(account.username));
const now = new Date();
if (pending.length) {
  const records = await Promise.all(pending.map(async account => ({
    openId: `local:${account.username}`,
    name: account.name,
    email: null,
    loginMethod: "local",
    username: account.username,
    passwordHash: await hashLocalPassword(password),
    mustChangePassword: true,
    passwordUpdatedAt: now,
    role: account.role,
    assignedWardId: account.assignedWardId,
    lastSignedIn: now,
  })));
  await database.insert(users).values(records);
}

const userCreated = pending.filter(account => account.role === "user").length;
const leaderCreated = pending.filter(account => account.role === "leader").length;
console.log(JSON.stringify({ wards: wards.length, requestedUsers: 135, requestedLeaders: 9, createdUsers: userCreated, createdLeaders: leaderCreated, skippedExisting: existingUsernames.size, skippedUsernames: [...existingUsernames].sort() }, null, 2));
