import { LucideIcon } from "lucide-react";

export function StatCard({ label, value, hint, icon: Icon, tone = "navy" }: { label: string; value: string | number; hint: string; icon: LucideIcon; tone?: "navy" | "red" | "slate" }) {
  const tones = {
    navy: "bg-[#0b2f5b] text-white shadow-[#0b2f5b]/20",
    red: "bg-[#ba1838] text-white shadow-[#ba1838]/20",
    slate: "bg-white text-slate-950 shadow-slate-950/5",
  };
  const iconTones = { navy: "bg-white/15", red: "bg-white/15", slate: "bg-slate-100 text-[#0b2f5b]" };
  return (
    <article className={`rounded-2xl p-5 shadow-lg ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${tone === "slate" ? "text-slate-500" : "text-white/65"}`}>{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>
        </div>
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${iconTones[tone]}`}><Icon size={20} /></span>
      </div>
      <p className={`mt-6 text-xs ${tone === "slate" ? "text-slate-500" : "text-white/70"}`}>{hint}</p>
    </article>
  );
}
