import { describe, expect, it } from "vitest";
import { hashLocalPassword, normalizeLocalUsername, passwordStrengthIssues, verifyLocalPassword } from "./local-auth";

describe("local account password protection", () => {
  it("normalizes a valid username and rejects unsafe credentials", async () => {
    expect(normalizeLocalUsername(" CanBo.Xa01 ")).toBe("canbo.xa01");
    expect(() => normalizeLocalUsername("cán bộ")).toThrow("Tên đăng nhập");
    await expect(hashLocalPassword("short")).rejects.toThrow("ít nhất 8 ký tự");
    await expect(hashLocalPassword("12345678")).resolves.toMatch(/^scrypt\$/);
  });

  it("reports every missing password requirement for the account-creation guidance", () => {
    expect(passwordStrengthIssues("matkhau")).toEqual(["ít nhất 8 ký tự"]);
    expect(passwordStrengthIssues("12345678")).toEqual([]);
  });

  it("stores passwords as salted hashes and verifies only the correct password", async () => {
    const password = "MatKhauNoiBo#2026";
    const hash = await hashLocalPassword(password);
    expect(hash).not.toContain(password);
    await expect(verifyLocalPassword(password, hash)).resolves.toBe(true);
    await expect(verifyLocalPassword("MatKhauKhac#2026", hash)).resolves.toBe(false);
  });
});
