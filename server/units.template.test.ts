import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function userContext(): TrpcContext {
  return {
    user: { id: 1, openId: "unit-template-user", name: "User", email: "user@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("units.template", () => {
  it("creates an Excel template with the mandated ward and team columns", async () => {
    const caller = appRouter.createCaller(userContext());
    const result = await caller.units.template();
    const workbook = XLSX.read(Buffer.from(result.base64, "base64"), { type: "buffer" });
    const worksheet = workbook.Sheets["DanhMucDonVi"];
    const headers = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 })[0];

    expect(result.filename).toBe("mau-cap-nhat-xa-phuong-don-vi-to.xlsx");
    expect(headers).toEqual(["Tên xã, phường", "Tên đơn vị/tổ", "Số lượng thành viên tối đa"]);
  });
});
