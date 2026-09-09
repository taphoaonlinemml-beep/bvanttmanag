import { describe, expect, it } from "vitest";
import { advanceCatalogImportProgress, createCatalogImportProgress, isCatalogImportBusy } from "./catalog-import-progress";

describe("catalog import progress", () => {
  it("reports readable stages with expected progress values", () => {
    expect(createCatalogImportProgress("danh-muc.xlsx", "reading")).toMatchObject({ fileName: "danh-muc.xlsx", stage: "reading", value: 12 });
    expect(createCatalogImportProgress("danh-muc.xlsx", "validating")).toMatchObject({ stage: "validating", value: 42 });
    expect(createCatalogImportProgress("danh-muc.xlsx", "complete")).toMatchObject({ stage: "complete", value: 100 });
  });

  it("advances only the import stage and caps the visual progress before completion", () => {
    const importing = createCatalogImportProgress("danh-muc.xlsx", "importing");
    expect(advanceCatalogImportProgress(importing)).toMatchObject({ stage: "importing", value: 74 });
    const capped = { ...importing, value: 92 };
    expect(advanceCatalogImportProgress(capped)).toEqual(capped);
    expect(advanceCatalogImportProgress(createCatalogImportProgress("danh-muc.xlsx", "complete"))).toMatchObject({ stage: "complete", value: 100 });
  });

  it("marks only ongoing stages as busy so repeated imports remain locked", () => {
    expect(isCatalogImportBusy(createCatalogImportProgress("danh-muc.xlsx", "reading"))).toBe(true);
    expect(isCatalogImportBusy(createCatalogImportProgress("danh-muc.xlsx", "validating"))).toBe(true);
    expect(isCatalogImportBusy(createCatalogImportProgress("danh-muc.xlsx", "importing"))).toBe(true);
    expect(isCatalogImportBusy(createCatalogImportProgress("danh-muc.xlsx", "complete"))).toBe(false);
    expect(isCatalogImportBusy(createCatalogImportProgress("danh-muc.xlsx", "error"))).toBe(false);
  });
});
