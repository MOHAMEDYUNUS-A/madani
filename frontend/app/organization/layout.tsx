"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  FileCheck2, 
  Package, 
  Settings, 
  ShieldCheck, 
  Sparkles, 
  LogOut,
  ChevronRight,
  LayoutDashboard,
  GraduationCap,
  UserCheck,
  Layers
} from "lucide-react";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMe()
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch(() => {
        router.push("/login");
      });
  }, [router]);

  // Route Interceptors based on granular role permissions
  useEffect(() => {
    if (!user) return;
    const roles = user.roles || [];
    const isSuper = roles.includes("SUPER_ADMIN");
    const isOrgAdmin = roles.includes("ORGANIZATION_ADMIN") || roles.includes("STAFF_ADMIN");

    // If dedicated staff member with assigned class, direct to focused Class Staff portal
    if (!isSuper && !isOrgAdmin && (roles.includes("STAFF") || roles.includes("DATA_ENTRY_STAFF"))) {
      router.push("/staff");
      return;
    }

    // Organizations must never access design editor
    if (pathname === "/organization/designer") {
      router.push("/organization/design-review");
      return;
    }

    if (pathname === "/organization/settings" && !isSuper && !isOrgAdmin) {
      router.push("/organization/students");
    }
  }, [pathname, user, router]);

  const handleLogout = async () => {
    try {
      await api.logout();
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 text-xs font-semibold tracking-wider uppercase">Loading Workspace...</p>
        </div>
      </div>
    );
  }

  const roles = user?.roles || [];
  const isSuper = roles.includes("SUPER_ADMIN");

  const menuItems = [
    { name: "Overview", path: "/organization", exact: true, icon: LayoutDashboard },
    { name: "Classes & Sections", path: "/organization/classes", icon: GraduationCap },
    { name: "Staff Management", path: "/organization/staff", icon: UserCheck },
    { name: "Students & Records", path: "/organization/students", icon: Users },
    { name: "3D ID Showcase", path: "/organization/showcase", icon: Sparkles },
    { name: "Design Review", path: "/organization/design-review", icon: FileCheck2 },
    { name: "Final Batch Review", path: "/organization/batch-review", icon: Layers },
    { name: "Print Tracking", path: "/organization/orders", icon: Package },
    { name: "Settings & Branding", path: "/organization/settings", icon: Settings },
  ];

  const initials = (user?.full_name || "Admin")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#172033] flex font-sans antialiased">
      {/* Enterprise Light Sidebar Navigation */}
      <aside className="w-64 border-r border-[#E2E8F0] bg-white flex flex-col justify-between shrink-0 shadow-xs">
        <div>
          {/* Brand Header */}
          <div className="h-16 border-b border-[#E2E8F0] flex items-center gap-3 px-6 bg-white">
            <div className="w-8 h-8 rounded-xl bg-[#4F46E5] flex items-center justify-center font-extrabold text-white text-xs shadow-md shadow-indigo-500/20">
              M
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-xs text-[#172033] uppercase block leading-none">
                Madani Workspace
              </span>
              <span className="text-[10px] text-[#4F46E5] font-bold tracking-wider uppercase mt-0.5 block">
                Client Tenant
              </span>
            </div>
          </div>

          {/* Org details banner */}
          {user && (
            <div className="p-4 border-b border-[#E2E8F0] bg-[#F1F5F9]/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Institution</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-[#4F46E5] border border-indigo-100">
                  {user.organization_id ? "Active" : "Root"}
                </span>
              </div>
              <div className="text-[#172033] font-bold text-xs truncate">
                {user.email.split("@")[0].toUpperCase()}
              </div>
            </div>
          )}

          {/* Menu Items */}
          <nav className="p-3 space-y-1">
            {menuItems.map((item) => {
              const active = item.exact 
                ? pathname === item.path 
                : pathname.startsWith(item.path);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    active 
                      ? "bg-[#4F46E5] text-white font-bold shadow-sm shadow-indigo-500/20" 
                      : "text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#172033]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </div>
                  {active && <ChevronRight className="w-3.5 h-3.5 text-white/80" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile footer */}
        <div className="p-4 border-t border-[#E2E8F0] space-y-2.5 bg-white">
          {isSuper && (
            <Link
              href="/admin/production"
              className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Super Admin Console
            </Link>
          )}

          {(isSuper || roles.includes("VENDOR")) && (
            <Link
              href="/vendor"
              className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 text-xs font-semibold transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" /> Switch to Vendor Portal
            </Link>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5 truncate pr-2">
              <div className="w-7 h-7 rounded-full bg-indigo-50 text-[#4F46E5] font-bold text-[10px] flex items-center justify-center shrink-0 border border-indigo-100">
                {initials}
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-[#172033] truncate">{user?.full_name}</div>
                <div className="text-[10px] text-[#64748B] font-mono truncate">@{user?.username}</div>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-1.5 hover:bg-rose-50 text-[#64748B] hover:text-rose-600 rounded-lg transition-all"
              title="Log Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-[#E2E8F0] bg-white flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-[#059669] border border-emerald-200">
              Connected Workspace
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono font-semibold text-[#64748B]">
            <span>TENANT ISOLATION ACTIVE</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 bg-[#F7F9FC]">
          {children}
        </main>
      </div>
    </div>
  );
}
