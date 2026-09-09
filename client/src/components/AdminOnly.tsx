import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert } from "lucide-react";
import { ReactNode } from "react";
import { useLocation } from "wouter";
import { parseLeaderDelegatedPermissions, type LeaderDelegatedPermission } from "@shared/leader-permissions";

export function AdminOnly({ children, permissions = [] }: { children: ReactNode; permissions?: LeaderDelegatedPermission[] }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  if (loading) return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-[#0b2f5b]" /></div>;
  if (user?.role === "admin" || (user?.role === "leader" && permissions.some(permission => parseLeaderDelegatedPermissions(user.adminPermissions).includes(permission)))) return <>{children}</>;
  return <div className="mx-auto grid min-h-[60vh] max-w-md place-items-center text-center"><div><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-700"><ShieldAlert size={26} /></span><h1 className="mt-5 text-xl font-bold text-slate-950">Không có quyền truy cập</h1><p className="mt-2 text-sm leading-6 text-slate-500">Phân hệ này chỉ dành cho tài khoản Quản trị viên. Vui lòng liên hệ cán bộ quản trị nếu cần hỗ trợ.</p><Button className="mt-5 bg-[#0b2f5b] hover:bg-[#08274c]" onClick={() => setLocation("/")}>Về trang tổng quan</Button></div></div>;
}
