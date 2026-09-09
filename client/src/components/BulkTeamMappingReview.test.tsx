import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { BulkTeamMappingReview, bulkMappingKey } from "./BulkTeamMappingReview";

const groups = [{ wardName: "Xã An Hòa", sourceTeamName: "Thôn Xuân Phong Tây", rows: [25, 26, 27], candidates: [{ id: 1, name: "Thôn Xuân Phong Bắc" }, { id: 2, name: "Thôn Xuân Phong Nam" }], suggestedTeamId: null }];

describe("BulkTeamMappingReview", () => {
  it("groups matching rows and disables confirmation until every group has a mapping", () => {
    const html = renderToStaticMarkup(<BulkTeamMappingReview totalRows={6000} groups={groups} mappings={{}} onChange={vi.fn()} onConfirm={vi.fn()} onCancel={vi.fn()} loading={false} />);
    expect(html).toContain("Đối soát Tổ theo nhóm trước khi nhập");
    expect(html).toContain("3 dòng");
    expect(html).toContain("1 nhóm chưa chọn");
    expect(html).toContain("disabled");
  });

  it("shows the bulk confirmation action after the group is mapped", () => {
    const html = renderToStaticMarkup(<BulkTeamMappingReview totalRows={6000} groups={groups} mappings={{ [bulkMappingKey(groups[0])]: 1 }} onChange={vi.fn()} onConfirm={vi.fn()} onCancel={vi.fn()} loading={false} />);
    expect(html).toContain("Đã chọn đủ ánh xạ");
    expect(html).toContain("Xác nhận ánh xạ và nhập 6.000 dòng");
  });
});
