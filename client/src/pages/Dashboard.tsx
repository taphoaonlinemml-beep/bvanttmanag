import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/_core/hooks/useAuth";
import { downloadBase64File } from "@/lib/download";
import { trpc } from "@/lib/trpc";
import { Activity, Building2, CalendarRange, ChartNoAxesCombined, FileSpreadsheet, ShieldCheck, UserRoundCheck, UsersRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type WardTreemapDatum = { wardId: number; wardName: string; activeMembers: number; teamCount: number; maxMembers: number; averageMembers: number; status: string; color: string; size?: number };
type TreemapTile = WardTreemapDatum & { x: number; y: number; width: number; height: number };
type ForceSection = { key: string; title: string; color: string; items: Array<{ name: string; value: number; color: string }> };
type ReportPeriodMode = "fixed" | "custom";

function currentMonthInput() { return new Date().toISOString().slice(0, 7); }

export default function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading } = trpc.dashboard.stats.useQuery();
  const { data: units = [] } = trpc.units.list.useQuery();
  const [hoveredWard, setHoveredWard] = useState<WardTreemapDatum | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportWardIds, setReportWardIds] = useState<number[]>([]);
  const [reportPeriodMode, setReportPeriodMode] = useState<ReportPeriodMode>("fixed");
  const [reportingMonth, setReportingMonth] = useState(currentMonthInput);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const isWardUser = user?.role === "user";
  const reportInput = { wardIds: isWardUser ? undefined : reportWardIds, periodMode: reportPeriodMode, reportingMonth: reportPeriodMode === "fixed" ? reportingMonth : undefined, startDate: reportPeriodMode === "custom" ? startDate || undefined : undefined, endDate: reportPeriodMode === "custom" ? endDate || undefined : undefined };
  const statisticsReportQuery = trpc.excel.exportStatisticsReport.useQuery(reportInput, { enabled: false });
  const today = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());
  const canExportStatistics = Boolean(user);
  const wards = units.filter(unit => unit.unitType === "ward");
  const selectedReportWards = wards.filter(ward => reportWardIds.includes(ward.id));
  const reportSelectionLabel = isWardUser ? (wards[0]?.name ?? "xã/phường được phân công") : reportWardIds.length === 0 ? "Chưa chọn xã/phường" : reportWardIds.length === 1 ? selectedReportWards[0]?.name ?? "01 xã/phường" : `${reportWardIds.length} xã/phường đã chọn`;

  async function exportStatisticsReport() {
    const result = await statisticsReportQuery.refetch();
    if (result.data) {
      downloadBase64File(result.data.base64, result.data.filename, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      toast.success("Đã tạo biểu mẫu BM1");
      setReportDialogOpen(false);
    } else if (result.error) {
      toast.error(result.error.message);
    }
  }

  function toggleReportWard(wardId: number) { setReportWardIds(current => current.includes(wardId) ? current.filter(id => id !== wardId) : [...current, wardId]); }

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-24 w-full" /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton className="h-40" key={index} />)}</div><Skeleton className="h-96 w-full" /></div>;
  }

  const stats = data ?? { total: 0, active: 0, inactive: 0, totalWards: 0, totalTeams: 0, wardTreemap: [], forceBuilding: [], byStatus: [] };
  const hasActivePersonnel = stats.active > 0;
  const treemapTiles = buildTreemapLayout(stats.wardTreemap as WardTreemapDatum[]);

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6">
      <PageHeader
        eyebrow="Bảng điều hành"
        title={`Xin chào, ${user?.name || "cán bộ quản lý"}`}
        description={`Cập nhật dữ liệu lực lượng ANTT cơ sở — ${today}.`}
        actions={<div className="flex flex-wrap items-center gap-2"><Badge className="h-8 rounded-full bg-[#e9f1fb] px-3 text-xs font-semibold text-[#0b2f5b] hover:bg-[#e9f1fb]"><Activity className="mr-1.5 h-3.5 w-3.5" />Dữ liệu trực tuyến</Badge>{canExportStatistics ? <Button variant="outline" className="border-[#d6e3f3] bg-white text-[#0b2f5b] hover:bg-[#edf4fc]" onClick={() => setReportDialogOpen(true)}><FileSpreadsheet className="mr-2 h-4 w-4" />Xuất biểu mẫu BM1</Button> : null}</div>}
      />

      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle className="flex items-center gap-2 text-[#0b2f5b]"><FileSpreadsheet className="h-5 w-5" />Xuất biểu mẫu 01 (BM1)</DialogTitle><DialogDescription>Chọn kỳ báo cáo và phạm vi xã/phường. Các chỉ tiêu chưa có dữ liệu nguồn đang được thể hiện bằng 0.</DialogDescription></DialogHeader><div className="space-y-5 py-2"><div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><Label>Loại kỳ báo cáo</Label><Select value={reportPeriodMode} onValueChange={value => setReportPeriodMode(value as ReportPeriodMode)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fixed">Ngày cố định theo BM1</SelectItem><SelectItem value="custom">Khoảng ngày tự chọn</SelectItem></SelectContent></Select></div>{reportPeriodMode === "fixed" ? <div className="space-y-2"><Label htmlFor="reporting-month">Tháng làm báo cáo</Label><Input id="reporting-month" type="month" value={reportingMonth} onChange={event => setReportingMonth(event.target.value)} /></div> : <><div className="space-y-2"><Label htmlFor="report-start">Từ ngày</Label><Input id="report-start" type="date" value={startDate} onChange={event => setStartDate(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="report-end">Đến ngày</Label><Input id="report-end" type="date" value={endDate} onChange={event => setEndDate(event.target.value)} /></div></>}</div><div className="rounded-xl border border-[#d6e3f3] bg-[#f8fbff] p-4"><div className="flex items-start gap-3"><CalendarRange className="mt-0.5 h-5 w-5 shrink-0 text-[#0b2f5b]" /><div><p className="text-sm font-semibold text-slate-900">{reportPeriodMode === "fixed" ? "Kỳ cố định" : "Khoảng ngày tự chọn"}</p><p className="mt-1 text-sm leading-5 text-slate-600">{reportPeriodMode === "fixed" ? "Hệ thống tính từ ngày 15 của tháng trước đến ngày 14 của tháng được chọn." : "Số liệu tuyển mới và thôi tham gia được tính theo hai ngày đã chọn."}</p></div></div></div>{isWardUser ? <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-900">Phạm vi báo cáo</p><p className="mt-1 text-sm text-slate-600">Biểu mẫu chỉ hiển thị 01 dòng của <strong>{reportSelectionLabel}</strong>, đúng địa bàn được Admin phân công.</p></div> : <div className="space-y-2"><div className="flex items-center justify-between gap-3"><div><Label>Chọn xã/phường</Label><p className="mt-1 text-xs text-slate-500">{reportSelectionLabel}</p></div><div className="flex gap-1"><Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => setReportWardIds(wards.map(ward => ward.id))}>Chọn tất cả</Button><Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => setReportWardIds([])}>Bỏ chọn</Button></div></div><div className="max-h-56 divide-y overflow-y-auto rounded-xl border border-slate-200 bg-white">{wards.map(ward => <label key={ward.id} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"><Checkbox checked={reportWardIds.includes(ward.id)} onCheckedChange={() => toggleReportWard(ward.id)} aria-label={`Chọn ${ward.name}`} /><span>{ward.name}</span></label>)}</div></div>}</div><DialogFooter><Button type="button" variant="outline" onClick={() => setReportDialogOpen(false)}>Hủy</Button><Button className="bg-[#0b2f5b] hover:bg-[#08274c]" onClick={exportStatisticsReport} disabled={statisticsReportQuery.isFetching || (!isWardUser && reportWardIds.length === 0) || (reportPeriodMode === "custom" && (!startDate || !endDate))}><FileSpreadsheet className="mr-2 h-4 w-4" />{statisticsReportQuery.isFetching ? "Đang tạo tệp" : "Xuất BM1"}</Button></DialogFooter></DialogContent></Dialog>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tổng nhân sự" value={stats.total} hint="Tất cả hồ sơ trên hệ thống" icon={UsersRound} tone="navy" />
        <StatCard label="Đang tham gia" value={stats.active} hint="Hồ sơ còn hiệu lực tham gia" icon={UserRoundCheck} tone="slate" />
        <StatCard label="Thôi tham gia" value={stats.inactive} hint="Cần rà soát chế độ, chính sách" icon={ShieldCheck} tone="red" />
        <StatCard label="Tổ quản lý" value={stats.totalTeams} hint={`${stats.totalWards} xã/phường đã được thiết lập`} icon={Building2} tone="slate" />
      </section>

      <section>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-slate-100 pb-5">
            <div><CardTitle className="text-base font-bold text-slate-900">Phân bổ lực lượng theo xã/phường</CardTitle><p className="mt-1 text-sm text-slate-500">Treemap thể hiện quân số đang tham gia tại toàn bộ {stats.totalWards} xã/phường; diện tích ô tỷ lệ với quân số.</p></div>
            <ChartNoAxesCombined className="h-5 w-5 text-[#0b2f5b]" />
          </CardHeader>
          <CardContent className="relative h-[430px] pt-5 sm:h-[500px]">
            {hasActivePersonnel ? <>
              <div className="absolute right-6 top-5 z-10 flex flex-wrap justify-end gap-x-4 gap-y-1 rounded-lg bg-white/90 px-2 py-1 text-xs font-medium text-slate-600 backdrop-blur"><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[#0f9d8a]" />Đủ định mức</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[#f59e0b]" />Thiếu nhân lực</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-slate-400" />Chưa có định mức</span></div>
              {hoveredWard && <WardDetailPopover ward={hoveredWard} />}
              <svg className="h-full w-full" viewBox="0 0 1000 600" role="img" aria-label="Biểu đồ Treemap phân bổ lực lượng theo xã, phường" preserveAspectRatio="none">{treemapTiles.map(tile => <WardTreemapTile key={tile.wardId} tile={tile} onHover={setHoveredWard} />)}</svg>
            </> : <EmptyChart label="Treemap sẽ hiển thị sau khi có hồ sơ đang tham gia tại các Tổ." />}
          </CardContent>
        </Card>
      </section>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-5"><CardTitle className="text-base font-bold text-slate-900">Kết quả xây dựng lực lượng</CardTitle><p className="mt-1 text-sm text-slate-500">Cơ cấu hồ sơ đang tham gia theo chức vụ, độ tuổi, giới tính và trình độ.</p></CardHeader>
        <CardContent className="pt-5">
          {hasActivePersonnel ? <div className="grid gap-5 lg:grid-cols-2">{(stats.forceBuilding as ForceSection[]).map(section => <ForceBuildingSection key={section.key} section={section} total={stats.active} />)}</div> : <div className="h-[250px]"><EmptyChart label="Biểu đồ sẽ hiển thị sau khi có hồ sơ đang tham gia." /></div>}
        </CardContent>
      </Card>

      <section className="rounded-2xl border border-[#d6e3f3] bg-gradient-to-r from-[#eef5fd] to-white p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#0b2f5b] text-white"><ShieldCheck size={22} /></span><div><h2 className="font-bold text-slate-950">Theo dõi chính sách và dữ liệu</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{stats.inactive > 0 ? `Có ${stats.inactive} hồ sơ đã thôi tham gia cần được rà soát kết quả giải quyết chính sách.` : "Chưa có hồ sơ thôi tham gia cần rà soát chính sách."}</p></div></div><a href="/chinh-sach" className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-[#0b2f5b] shadow-sm ring-1 ring-[#d6e3f3] transition hover:bg-slate-50">Xem danh sách</a></div>
      </section>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return <div className="flex h-full flex-col items-center justify-center text-center"><div className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-400"><ChartNoAxesCombined size={20} /></div><p className="mt-3 max-w-xs text-sm leading-6 text-slate-500">{label}</p></div>;
}

function WardTreemapTile({ tile, onHover }: { tile: TreemapTile; onHover: (ward: WardTreemapDatum | null) => void }) {
  const { x, y, width, height } = tile;
  const ward = tile;
  const showLabel = width > 110 && height > 55;
  const shortName = ward.wardName.length > 24 ? `${ward.wardName.slice(0, 22)}…` : ward.wardName;
  return <g onMouseEnter={() => onHover(ward)} onMouseLeave={() => onHover(null)}><rect x={x} y={y} width={width} height={height} rx={5} fill={ward.color} className="cursor-pointer transition-opacity hover:opacity-85" /><title>{`${ward.wardName}: ${ward.activeMembers} thành viên; ${ward.teamCount} Tổ bảo vệ an ninh, trật tự; ${ward.averageMembers.toFixed(1)} người/Tổ`}</title>{showLabel && <><text x={x + 10} y={y + 21} fill="white" fontSize={Math.min(14, Math.max(10, width / 15))} fontWeight="700">{shortName}</text><text x={x + 10} y={y + 41} fill="rgba(255,255,255,0.92)" fontSize={12}>{ward.activeMembers} thành viên</text></>}</g>;
}

function buildTreemapLayout(wards: WardTreemapDatum[]): TreemapTile[] {
  const canvasWidth = 1000;
  const canvasHeight = 600;
  const gap = 3;
  const values = wards.map(ward => ({ ...ward, size: Math.max(ward.activeMembers, 0.35) }));
  const total = values.reduce((sum, ward) => sum + ward.size, 0);
  if (!total) return [];
  const targetRows = Math.min(9, Math.max(1, Math.ceil(Math.sqrt(values.length / 1.8))));
  const targetWeight = total / targetRows;
  const groups: Array<typeof values> = [];
  let current: typeof values = [];
  let currentWeight = 0;
  values.forEach((ward, index) => {
    const remainingItems = values.length - index;
    const remainingRows = targetRows - groups.length;
    if (current.length && currentWeight >= targetWeight && remainingItems >= remainingRows) { groups.push(current); current = []; currentWeight = 0; }
    current.push(ward);
    currentWeight += ward.size;
  });
  if (current.length) groups.push(current);
  let y = 0;
  return groups.flatMap(group => {
    const groupWeight = group.reduce((sum, ward) => sum + ward.size, 0);
    const height = (groupWeight / total) * canvasHeight;
    let x = 0;
    const tiles = group.map(ward => {
      const width = (ward.size / groupWeight) * canvasWidth;
      const tile = { ...ward, x: x + gap / 2, y: y + gap / 2, width: Math.max(0, width - gap), height: Math.max(0, height - gap) };
      x += width;
      return tile;
    });
    y += height;
    return tiles;
  });
}

function WardDetailPopover({ ward }: { ward: WardTreemapDatum }) {
  return <div className="pointer-events-none absolute bottom-5 right-5 z-20 w-64 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur"><p className="text-sm font-bold text-slate-950">{ward.wardName}</p><div className="mt-3 grid grid-cols-2 gap-3 text-xs"><Metric label="Đang tham gia" value={`${ward.activeMembers} người`} /><Metric label="Số Tổ ANTT" value={`${ward.teamCount} Tổ`} /><Metric label="Bình quân" value={`${ward.averageMembers.toFixed(1)} người/Tổ`} /><Metric label="Định mức" value={ward.maxMembers ? `${ward.maxMembers} người` : "Chưa thiết lập"} /></div></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-slate-500">{label}</p><p className="mt-0.5 font-semibold text-slate-800">{value}</p></div>;
}

function ForceBuildingSection({ section, total }: { section: ForceSection; total: number }) {
  return <div className="overflow-hidden rounded-xl border border-slate-200"><div className="px-4 py-2 text-sm font-bold text-white" style={{ background: section.color }}>{section.title}</div><div className="divide-y divide-slate-100">{section.items.map(item => { const percentage = total ? (item.value / total) * 100 : 0; return <div className="grid grid-cols-[minmax(92px,1fr)_44px_minmax(90px,1.6fr)_56px] items-center gap-2 px-3 py-2 text-xs" key={item.name}><span className="font-semibold text-slate-700">{item.name}</span><strong className="text-right text-slate-800">{item.value}</strong><div className="h-3 overflow-hidden rounded-sm bg-slate-100"><div className="h-full rounded-sm transition-[width] duration-300" style={{ width: `${percentage}%`, background: `linear-gradient(90deg, ${item.color}, ${item.color}99)` }} /></div><span className="text-right font-bold text-slate-700">{percentage.toFixed(1)}%</span></div>; })}</div></div>;
}
