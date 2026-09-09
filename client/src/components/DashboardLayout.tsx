import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import { ArchiveRestore, Building2, ClipboardCheck, KeyRound, LayoutDashboard, Loader2, LogOut, PanelLeft, Settings, ShieldCheck, Users } from "lucide-react";
import { CSSProperties, FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { parseLeaderDelegatedPermissions, type LeaderDelegatedPermission } from "@shared/leader-permissions";

const menuItems: Array<{ icon: typeof LayoutDashboard; label: string; path: string; adminOnly?: boolean; permission?: LeaderDelegatedPermission; permissions?: LeaderDelegatedPermission[] }> = [
  { icon: LayoutDashboard, label: "Tổng quan", path: "/" },
  { icon: Users, label: "Danh sách thành viên", path: "/nhan-su" },
  { icon: Building2, label: "Đơn vị / tổ", path: "/don-vi" },
  { icon: ClipboardCheck, label: "Kết quả chính sách", path: "/chinh-sach" },
  { icon: ArchiveRestore, label: "Backup & dữ liệu", path: "/du-lieu", adminOnly: true, permission: "manageBackup" },
  { icon: Settings, label: "Cài đặt", path: "/cai-dat", adminOnly: true, permissions: ["manageAccounts", "manageMobileSync", "transferData"] },
];

function roleLabel(role: "admin" | "leader" | "user" | undefined) {
  if (role === "admin") return "Quản trị viên";
  if (role === "leader") return "Lãnh đạo — xem toàn bộ";
  return "Cán bộ xã/phường";
}

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;
function passwordStrengthIssues(value: string) { return value.length < 8 ? ["ít nhất 8 ký tự"] : []; }

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user, logout } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const localLoginMutation = trpc.auth.localLogin.useMutation({ onSuccess: () => window.location.assign("/"), onError: error => toast.error(error.message || "Không thể đăng nhập bằng tài khoản nội bộ") });
  const changePasswordMutation = trpc.auth.changeLocalPassword.useMutation({ onSuccess: () => { toast.success("Đã đổi mật khẩu. Đang mở hệ thống..."); window.location.assign("/"); }, onError: error => toast.error(error.message || "Không thể đổi mật khẩu") });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    const submitLocalLogin = (event: FormEvent) => { event.preventDefault(); localLoginMutation.mutate({ username, password }); };
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb] p-5">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5 sm:p-9">
          <div className="flex flex-col items-center gap-6">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#b91d3b] text-white shadow-lg shadow-red-900/30"><ShieldCheck size={28} /></span>
              <h1 className="text-2xl font-bold tracking-tight text-center text-[#0b2f5b]">
                Hệ thống Quản lý Lực lượng ANTT
              </h1>
              <p className="text-sm text-muted-foreground text-center max-w-sm leading-6">
                Cán bộ đăng nhập bằng tài khoản nội bộ do Admin cấp hoặc tài khoản đăng nhập tập trung.
            </p>
          </div>
          <form className="mt-7 space-y-4" onSubmit={submitLocalLogin}>
            <div><label htmlFor="local-username" className="mb-1.5 block text-sm font-semibold text-slate-700">Tên đăng nhập</label><Input id="local-username" autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} placeholder="Ví dụ: canbo.xa01" required /></div>
            <div><label htmlFor="local-password" className="mb-1.5 block text-sm font-semibold text-slate-700">Mật khẩu</label><Input id="local-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Mật khẩu do Admin cấp" required /></div>
            <Button type="submit" size="lg" className="w-full bg-[#0b2f5b] hover:bg-[#08274c]" disabled={localLoginMutation.isPending}>{localLoginMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}Đăng nhập tài khoản nội bộ</Button>
          </form>
          <div className="my-6 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />hoặc<span className="h-px flex-1 bg-slate-200" /></div>
          <Button onClick={() => startLogin()} size="lg" variant="outline" className="w-full border-slate-300">Đăng nhập tập trung</Button>
          <p className="mt-4 text-center text-xs leading-5 text-slate-500">Quên mật khẩu? Liên hệ Admin để được cấp lại mật khẩu tài khoản nội bộ.</p>
        </div>
      </div>
    );
  }

  if (user.loginMethod === "local" && user.mustChangePassword) {
    const strengthIssues = passwordStrengthIssues(newPassword);
    const submitPasswordChange = (event: FormEvent) => { event.preventDefault(); if (strengthIssues.length) { toast.error(`Mật khẩu mới cần có ${strengthIssues.join(", ")}`); return; } if (newPassword !== confirmPassword) { toast.error("Xác nhận mật khẩu mới chưa khớp"); return; } changePasswordMutation.mutate({ currentPassword, newPassword }); };
    return <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb] p-5"><div className="w-full max-w-md rounded-3xl border border-[#d7e4f2] bg-white p-7 shadow-xl shadow-slate-900/5 sm:p-9"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#edf4fc] text-[#0b2f5b]"><KeyRound size={27} /></span><p className="mt-6 text-center text-xs font-bold uppercase tracking-[0.16em] text-[#b91d3b]">Bảo mật tài khoản</p><h1 className="mt-2 text-center text-2xl font-bold text-slate-950">Đổi mật khẩu tạm</h1><p className="mt-3 text-center text-sm leading-6 text-slate-600">Đây là lần đăng nhập đầu tiên hoặc mật khẩu vừa được Admin cấp lại. Vui lòng thiết lập mật khẩu mới để tiếp tục.</p><form className="mt-6 space-y-4" onSubmit={submitPasswordChange}><div><label htmlFor="current-password" className="mb-1.5 block text-sm font-semibold text-slate-700">Mật khẩu tạm hiện tại</label><Input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} required /></div><div><label htmlFor="new-password" className="mb-1.5 block text-sm font-semibold text-slate-700">Mật khẩu mới</label><Input id="new-password" type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={event => setNewPassword(event.target.value)} required /><p className={`mt-1 text-xs ${strengthIssues.length ? "text-amber-700" : "text-emerald-700"}`}>{strengthIssues.length ? `Cần bổ sung: ${strengthIssues.join(", ")}.` : "Tối thiểu 8 ký tự. Khuyến nghị kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt."}</p></div><div><label htmlFor="confirm-password" className="mb-1.5 block text-sm font-semibold text-slate-700">Xác nhận mật khẩu mới</label><Input id="confirm-password" type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} required /></div><Button type="submit" size="lg" className="w-full bg-[#0b2f5b] hover:bg-[#08274c]" disabled={changePasswordMutation.isPending || strengthIssues.length > 0}>{changePasswordMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}Lưu mật khẩu mới</Button></form><Button type="button" variant="ghost" className="mt-3 w-full text-slate-600" onClick={logout}>Đăng xuất</Button></div></div>;
  }

  if (user.role === "user" && !user.assignedWardId) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb] p-5"><div className="w-full max-w-lg rounded-3xl border border-[#d8e5f2] bg-white p-7 text-center shadow-xl shadow-slate-900/5 sm:p-10"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#edf4fc] text-[#0b2f5b]"><ShieldCheck size={26} /></span><p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-[#b91d3b]">Chờ phân công địa bàn</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Tài khoản chưa được gán xã/phường</h1><p className="mt-4 text-sm leading-7 text-slate-600">Tài khoản của bạn đã đăng nhập thành công nhưng chưa có phạm vi quản lý. Vui lòng liên hệ Admin để được phân công một xã/phường trước khi nhập hoặc cập nhật dữ liệu.</p><div className="mt-7 rounded-xl bg-slate-50 p-4 text-left text-sm text-slate-600"><strong className="text-slate-800">Sau khi được phân công:</strong> bạn chỉ xem, thêm và cập nhật hồ sơ thuộc xã/phường được giao; các thao tác xóa do Admin thực hiện.</div><Button variant="outline" className="mt-7 border-slate-300" onClick={logout}><LogOut className="mr-2 h-4 w-4" />Đăng xuất</Button></div></div>;
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const visibleMenuItems = menuItems.filter(item => !item.adminOnly || user?.role === "admin" || (user?.role === "leader" && ((item.permission && parseLeaderDelegatedPermissions(user.adminPermissions).includes(item.permission)) || item.permissions?.some(permission => parseLeaderDelegatedPermissions(user.adminPermissions).includes(permission)))));
  const activeMenuItem = visibleMenuItems.find(item => item.path === location);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0 bg-[#08274c] text-slate-100"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-20 justify-center border-b border-white/10">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-white/75 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 shrink-0"
                aria-label="Thu gọn điều hướng"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold tracking-tight truncate text-sm text-white">QL LỰC LƯỢNG ANTT</span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 pt-3">
            <SidebarMenu className="px-3 py-1">
              {visibleMenuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-11 rounded-xl transition-all font-medium text-slate-300 hover:bg-white/10 hover:text-white data-[active=true]:bg-[#b91d3b] data-[active=true]:text-white data-[active=true]:shadow-lg data-[active=true]:shadow-red-950/30`}
                    >
                      <item.icon
                        className="h-4 w-4"
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="border-t border-white/10 p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/10 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
                  <Avatar className="h-9 w-9 border border-white/20 shrink-0">
                    <AvatarFallback className="bg-white/10 text-xs font-bold text-white">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none text-white">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-white/55 truncate mt-1.5">
                      {roleLabel(user?.role)}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem?.label ?? "Menu"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 bg-[#f5f7fb] p-4 sm:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </>
  );
}
