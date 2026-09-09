import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(nodeScrypt);
const PASSWORD_MIN_LENGTH = 8;

export function passwordStrengthIssues(value: string) {
  const issues: string[] = [];
  if (value.length < PASSWORD_MIN_LENGTH) issues.push(`ít nhất ${PASSWORD_MIN_LENGTH} ký tự`);
  return issues;
}

export function normalizeLocalUsername(value: string) {
  const username = value.trim().toLocaleLowerCase("en-US");
  if (!/^[a-z0-9._-]{3,80}$/.test(username)) throw new Error("Tên đăng nhập gồm 3–80 ký tự: chữ thường, số, dấu chấm, gạch dưới hoặc gạch ngang");
  return username;
}

export async function hashLocalPassword(value: string) {
  const issues = passwordStrengthIssues(value);
  if (issues.length) throw new Error(`Mật khẩu phải có ${issues.join(", ")}`);
  const salt = randomBytes(16);
  const derived = await scrypt(value, salt, 64) as Buffer;
  return `scrypt$16384$8$1$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function verifyLocalPassword(value: string, storedHash: string) {
  const [algorithm, cost, blockSize, parallelization, encodedSalt, encodedHash] = storedHash.split("$");
  if (algorithm !== "scrypt" || cost !== "16384" || blockSize !== "8" || parallelization !== "1" || !encodedSalt || !encodedHash) return false;
  const expected = Buffer.from(encodedHash, "base64url");
  const actual = await scrypt(value, Buffer.from(encodedSalt, "base64url"), expected.length) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
