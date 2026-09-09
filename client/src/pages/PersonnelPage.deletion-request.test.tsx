import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Dialog } from "@/components/ui/dialog";
import { DeletionRequestForm, FileUploadCard } from "./PersonnelPage";

describe("DeletionRequestForm", () => {
  it("explains that deletion needs Admin approval and keeps sending disabled before a valid reason", () => {
    const html = renderToStaticMarkup(<Dialog open><DeletionRequestForm target={{ id: 1, name: "Nguyễn Văn A" }} pending={false} onCancel={() => undefined} onSubmit={async () => undefined} /></Dialog>);
    expect(html).toContain("Yêu cầu xóa hồ sơ");
    expect(html).toContain("Nguyễn Văn A");
    expect(html).toContain("Admin sẽ xem lý do");
    expect(html).toContain("Đính kèm tài liệu minh chứng");
    expect(html).toContain("Có thể chọn nhiều ảnh hoặc PDF");
    expect(html).toContain("disabled");
  });
});

describe("FileUploadCard", () => {
  it("renders the participation and cessation decision upload cards for images and PDFs", () => {
    const participation = renderToStaticMarkup(<FileUploadCard title="Quyết định tham gia lực lượng" description="Ảnh hoặc PDF" accept="image/*,application/pdf" disabled={false} onChange={() => undefined} />);
    const cessation = renderToStaticMarkup(<FileUploadCard title="Quyết định cho thôi tham gia" description="Ảnh hoặc PDF" accept="image/*,application/pdf" disabled={false} onChange={() => undefined} />);
    expect(participation).toContain("Quyết định tham gia lực lượng");
    expect(cessation).toContain("Quyết định cho thôi tham gia");
    expect(participation).toContain("application/pdf");
    expect(cessation).toContain("application/pdf");
  });
});
