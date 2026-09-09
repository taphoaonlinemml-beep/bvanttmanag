import React from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type BulkTeamMappingGroup = {
  wardName: string;
  sourceTeamName: string;
  rows: number[];
  candidates: Array<{ id: number; name: string }>;
  suggestedTeamId: number | null;
};

type Props = {
  totalRows: number;
  groups: BulkTeamMappingGroup[];
  mappings: Record<string, number>;
  onChange: (key: string, teamId: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
};

export function bulkMappingKey(group: Pick<BulkTeamMappingGroup, "wardName" | "sourceTeamName">) {
  return `${group.wardName.trim().toLocaleLowerCase("vi")}|${group.sourceTeamName.trim().toLocaleLowerCase("vi")}`;
}

export function BulkTeamMappingReview({ totalRows, groups, mappings, onChange, onConfirm, onCancel, loading }: Props) {
  const unresolved = groups.filter(group => !mappings[bulkMappingKey(group)]).length;
  const affectedRows = groups.reduce((total, group) => total + group.rows.length, 0);
  return <Card className="border-[#f2d8ad] bg-[#fffdf7] shadow-sm">
    <CardHeader className="border-b border-[#f2e6ca] pb-4">
      <div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700"><AlertTriangle className="h-5 w-5" /></span><div><CardTitle className="text-base text-slate-950">Đối soát Tổ theo nhóm trước khi nhập</CardTitle><CardDescription className="mt-1 leading-5">File có {totalRows.toLocaleString("vi-VN")} dòng. Hệ thống gom {affectedRows.toLocaleString("vi-VN")} dòng chưa khớp thành {groups.length.toLocaleString("vi-VN")} nhóm; mỗi lựa chọn dưới đây được áp dụng cho tất cả dòng trong cùng nhóm.</CardDescription></div></div>
    </CardHeader>
    <CardContent className="space-y-4 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-sm ring-1 ring-amber-100"><span><b className="text-slate-950">{groups.length}</b> nhóm cần đối soát · <b className={unresolved ? "text-[#b45309]" : "text-emerald-700"}>{unresolved ? `${unresolved} nhóm chưa chọn` : "Đã chọn đủ ánh xạ"}</b></span><span className="text-slate-500">Không cần chỉnh sửa từng dòng Excel.</span></div>
      <div className="max-h-[560px] overflow-auto rounded-xl border border-slate-200 bg-white"><Table><TableHeader className="sticky top-0 bg-slate-50"><TableRow><TableHead>Xã/Phường</TableHead><TableHead>Tên Tổ trong file</TableHead><TableHead>Số dòng áp dụng</TableHead><TableHead>Tổ thay thế trong hệ thống</TableHead></TableRow></TableHeader><TableBody>{groups.map(group => { const key = bulkMappingKey(group); return <TableRow key={key}><TableCell className="font-medium text-slate-700">{group.wardName}</TableCell><TableCell><span className="font-medium text-[#95112e]">{group.sourceTeamName}</span>{group.suggestedTeamId ? <p className="mt-1 text-xs text-emerald-700">Đã tự gợi ý theo tên gần khớp.</p> : null}</TableCell><TableCell className="text-slate-600">{group.rows.length.toLocaleString("vi-VN")} dòng <span className="block text-xs text-slate-400">Dòng {group.rows.slice(0, 3).join(", ")}{group.rows.length > 3 ? "…" : ""}</span></TableCell><TableCell><select aria-label={`Ánh xạ Tổ cho ${group.sourceTeamName}`} className="h-9 min-w-56 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800 outline-none focus:border-[#0b2f5b] focus:ring-2 focus:ring-[#d6e3f3]" value={mappings[key]?.toString() ?? ""} onChange={event => onChange(key, Number(event.target.value))}><option value="">Chọn Tổ tương ứng</option>{group.candidates.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></TableCell></TableRow>; })}</TableBody></Table></div>
      <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={onCancel} disabled={loading}><X className="mr-2 h-4 w-4" />Chọn file khác</Button><Button className="bg-[#0b2f5b] hover:bg-[#08264a]" onClick={onConfirm} disabled={loading || unresolved > 0}>{loading ? "Đang nhập dữ liệu…" : <><CheckCircle2 className="mr-2 h-4 w-4" />Xác nhận ánh xạ và nhập {totalRows.toLocaleString("vi-VN")} dòng</>}</Button></div>
    </CardContent>
  </Card>;
}
