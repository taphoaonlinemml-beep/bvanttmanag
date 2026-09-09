import * as XLSX from "xlsx";
import { describe, expect, it, vi } from "vitest";

const listUnits = vi.hoisted(() => vi.fn());
const importUnitCatalog = vi.hoisted(() => vi.fn());

vi.mock("./db", () => ({ listUnits, importUnitCatalog }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function adminContext(): TrpcContext {
  return { user: { id: 1, openId: "catalog-admin", name: "Admin", email: "admin@example.com", loginMethod: "manus", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] };
}

function largeCatalogBase64() {
  const rows = Array.from({ length: 260 }, (_, index) => ({ "Tên xã, phường": `Phường ${index + 1}`, "Tên đơn vị/tổ": `Tổ ${index + 1}`, "Số lượng thành viên tối đa": 5 }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "DanhMucDonVi");
  return XLSX.write(workbook, { bookType: "xlsx", type: "base64" });
}

describe("units.importCatalog large mutation", () => {
  it("accepts a large catalog and returns a successful tRPC result", async () => {
    listUnits.mockResolvedValue([]);
    importUnitCatalog.mockResolvedValue({ totalWards: 260, totalTeams: 260, removedWards: 0, removedUnits: 0 });
    const caller = appRouter.createCaller(adminContext());
    await expect(caller.units.importCatalog({ base64: largeCatalogBase64() })).resolves.toEqual({ totalWards: 260, totalTeams: 260, removedWards: 0, removedUnits: 0, errors: [] });
    expect(importUnitCatalog).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ wardName: "Phường 1", unitName: "Tổ 1", maxMembers: 5 })]));
  });

  it("accepts a new ward and its teams through the import route", async () => {
    listUnits.mockResolvedValue([]);
    importUnitCatalog.mockResolvedValue({ totalWards: 1, totalTeams: 2, removedWards: 0, removedUnits: 0 });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
      { "Tên xã, phường": "Xã Mới", "Tên đơn vị/tổ": "Tổ A", "Số lượng thành viên tối đa": 8 },
      { "Tên xã, phường": "Xã Mới", "Tên đơn vị/tổ": "Tổ B", "Số lượng thành viên tối đa": 10 },
    ]), "DanhMucDonVi");
    const base64 = XLSX.write(workbook, { bookType: "xlsx", type: "base64" });
    const caller = appRouter.createCaller(adminContext());
    await expect(caller.units.importCatalog({ base64 })).resolves.toEqual({ totalWards: 1, totalTeams: 2, removedWards: 0, removedUnits: 0, errors: [] });
    expect(importUnitCatalog).toHaveBeenLastCalledWith([
      { wardName: "Xã Mới", unitName: "Tổ A", maxMembers: 8 },
      { wardName: "Xã Mới", unitName: "Tổ B", maxMembers: 10 },
    ]);
  });
});
