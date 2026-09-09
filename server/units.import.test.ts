import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function adminContext(): TrpcContext {
  return {
    user: { id: 1, openId: "catalog-admin", name: "Admin", email: "admin@example.com", loginMethod: "manus", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

function asBase64(headers: string[]) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([headers]), "DanhMucDonVi");
  return XLSX.write(workbook, { bookType: "xlsx", type: "base64" });
}

describe("units.importCatalog", () => {
  it("rejects a file whose mandated catalog headers are missing", async () => {
    const caller = appRouter.createCaller(adminContext());
    await expect(caller.units.importCatalog({ base64: asBase64(["Tên đơn vị/tổ"]) })).rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringContaining("Tên xã, phường") });
  });

  it("accepts a valid empty catalog template without writing any records", async () => {
    const caller = appRouter.createCaller(adminContext());
    await expect(caller.units.importCatalog({ base64: asBase64(["Tên xã, phường", "Tên đơn vị/tổ", "Số lượng thành viên tối đa"]) })).resolves.toEqual({ totalWards: 0, totalTeams: 0, removedWards: 0, removedUnits: 0, errors: [] });
  });
});
