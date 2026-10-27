"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  FileCheck2, 
  Package, 
  Settings, 
  LogOut,
  ChevronRight,
  LayoutDashboard,
  GraduationCap,
  UserCheck,
  Layers,
  Menu,
  X,
  Sparkles
} from "lucide-react";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Route Interceptors based on role permissions
  useEffect(() => {
    if (!user) return;
    const roles = user.roles || [];
    const isSuper = roles.includes("SUPER_ADMIN");
    const isOrgAdmin = roles.includes("ORGANIZATION_ADMIN") || roles.includes("STAFF_ADMIN");

    if (!isSuper && !isOrgAdmin && (roles.includes("STAFF") || roles.includes("DATA_ENTRY_STAFF"))) {
      router.push("/staff");
      return;
    }

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
      <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#15803D] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 text-sm font-semibold tracking-wider uppercase">Loading Workspace...</p>
        </div>
      </div>
    );
  }

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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col md:flex-row font-sans antialiased">
      {/* Mobile Header Bar */}
      <div className="md:hidden h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-emerald-200">
            <Image 
              src="/madani_enterprises_app_icon.png" 
              alt="Madani Enterprises" 
              width={32} 
              height={32} 
              className="w-full h-full object-cover"
            />
          </div>
          <span className="font-extrabold text-sm tracking-tight text-[#14532D] uppercase">
            Madani Organization
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        ${mobileMenuOpen ? "fixed inset-y-0 left-0 z-50 w-72 flex" : "hidden"} 
        md:flex md:w-64 border-r border-slate-200 bg-white flex-col justify-between shrink-0 shadow-xs md:sticky md:top-0 md:h-screen
      `}>
        <div className="overflow-y-auto">
          {/* Brand Header */}
          <div className="h-16 border-b border-slate-200 flex items-center justify-between px-5 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-emerald-300 shadow-sm">
                <Image 
                  src="/madani_enterprises_app_icon.png" 
                  alt="Madani Enterprises" 
                  width={36} 
                  height={36} 
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <span className="font-extrabold tracking-tight text-sm text-[#14532D] uppercase block leading-none">
                  Madani Platform
                </span>
                <span className="text-[11px] text-[#15803D] font-bold tracking-wider uppercase mt-1 block">
                  Client Workspace
                </span>
              </div>
            </div>
            {mobileMenuOpen && (
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="md:hidden p-1 text-slate-500 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Org details banner */}
          {user && (
            <div className="p-4 border-b border-slate-200 bg-emerald-50/40">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Institution Workspace</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#14532D] border border-emerald-300">
                  Active
                </span>
              </div>
              <div className="text-slate-900 font-extrabold text-sm truncate">
                {user.email.split("@")[0].toUpperCase()}
              </div>
            </div>
          )}

          {/* Menu Items */}
          <nav className="p-3 space-y-1.5">
            {menuItems.map((item) => {
              const active = item.exact 
                ? pathname === item.path 
                : pathname.startsWith(item.path);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                    active 
                      ? "bg-[#15803D] text-white font-bold shadow-sm" 
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </div>
                  {active && <ChevronRight className="w-4 h-4 text-white/90" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile footer - clean without cross-portal overlap */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 truncate pr-2">
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-[#14532D] font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-300">
                {initials}
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-slate-900 truncate">{user?.full_name}</div>
                <div className="text-[11px] text-slate-500 font-mono truncate">@{user?.username}</div>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-200 bg-white hidden md:flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-[#15803D] border border-emerald-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#15803D]"></span>
              Institution Portal Active
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono font-semibold text-slate-500">
            <span>SECURE MULTI-TENANT ISOLATION</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#F8FAFC]">
          {children}
        </main>
      </div>
    </div>
  );
}
