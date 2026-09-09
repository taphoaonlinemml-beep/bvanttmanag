import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createCatalogImportProgress } from "@shared/catalog-import-progress";
import { CatalogImportProgressPanel } from "./UnitsPage";

describe("CatalogImportProgressPanel", () => {
  it("renders the importing stage accessibly", () => {
    const html = renderToStaticMarkup(<CatalogImportProgressPanel progress={createCatalogImportProgress("danh-muc.xlsx", "importing")} />);
    expect(html).toContain("Tiến trình nhập danh mục");
    expect(html).toContain("72%");
    expect(html).toContain("aria-label=\"Tiến trình nhập danh mục Excel\"");
  });

  it("renders distinct completion and error messages", () => {
    const complete = renderToStaticMarkup(<CatalogImportProgressPanel progress={createCatalogImportProgress("danh-muc.xlsx", "complete", "Đã nhập xong")} />);
    const error = renderToStaticMarkup(<CatalogImportProgressPanel progress={createCatalogImportProgress("danh-muc.xlsx", "error", "File chưa đúng mẫu")} />);
    expect(complete).toContain("Nhập danh mục hoàn tất");
    expect(complete).toContain("Đã nhập xong");
    expect(error).toContain("Nhập tệp cần xử lý");
    expect(error).toContain("File chưa đúng mẫu");
  });
});
