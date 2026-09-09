export type CatalogImportStage = "reading" | "validating" | "importing" | "complete" | "error";
export type CatalogImportProgress = { fileName: string; value: number; stage: CatalogImportStage; message: string };

const defaults: Record<CatalogImportStage, Pick<CatalogImportProgress, "value" | "message">> = {
  reading: { value: 12, message: "Đang đọc nội dung tệp Excel..." },
  validating: { value: 42, message: "Đã đọc tệp. Đang kiểm tra cấu trúc và dữ liệu..." },
  importing: { value: 72, message: "Đang nhập xã/phường, Tổ và định mức quân số..." },
  complete: { value: 100, message: "Hoàn tất nhập danh mục." },
  error: { value: 100, message: "Không thể hoàn tất nhập tệp." },
};

export function createCatalogImportProgress(fileName: string, stage: CatalogImportStage, message?: string): CatalogImportProgress {
  return { fileName, stage, ...defaults[stage], ...(message ? { message } : {}) };
}

export function advanceCatalogImportProgress(progress: CatalogImportProgress): CatalogImportProgress {
  if (progress.stage !== "importing" || progress.value >= 92) return progress;
  return { ...progress, value: Math.min(92, progress.value + 2), message: "Hệ thống đang xử lý danh mục, vui lòng không đóng trang..." };
}

export function isCatalogImportBusy(progress: CatalogImportProgress | null | undefined) {
  return progress?.stage === "reading" || progress?.stage === "validating" || progress?.stage === "importing";
}
