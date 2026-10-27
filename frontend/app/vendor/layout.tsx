"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { 
  LayoutDashboard, 
  Building2, 
  Sparkles, 
  Printer, 
  CreditCard, 
  Settings, 
  ShieldCheck, 
  Building, 
  LogOut,
  ChevronRight,
  CheckCircle2
} from "lucide-react";

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMe()
      .then((data) => {
        const roles = data.roles || [];
        if (!roles.includes("VENDOR") && !roles.includes("SUPER_ADMIN")) {
          router.push("/organization/students");
          return;
        }
        setUser(data);
        setLoading(false);
      })
      .catch(() => {
        router.push("/login");
      });
  }, [router]);

  const handleLogout = async () => {
    await api.logout();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Loading Vendor Studio...</p>
        </div>
      </div>
    );
  }

  const menuItems = [
    { name: "Vendor Overview", path: "/vendor", icon: LayoutDashboard },
    { name: "Client Organizations", path: "/vendor/organizations", icon: Building2 },
    { name: "AI Design Studio", path: "/vendor/ai-studio", icon: Sparkles },
    { name: "Batch Validation", path: "/vendor/batch-validation", icon: CheckCircle2 },
    { name: "Print Production", path: "/vendor/production", icon: Printer },
    { name: "Plan & Billing", path: "/vendor/billing", icon: CreditCard },
    { name: "Studio Settings", path: "/vendor/settings", icon: Settings },
  ];

  const roles = user?.roles || [];
  const isSuper = roles.includes("SUPER_ADMIN");

  const initials = (user?.full_name || "Vendor")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#172033] flex font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#E2E8F0] bg-white flex flex-col justify-between shrink-0 shadow-xs z-10">
        <div>
          {/* Logo / Header */}
          <div className="h-16 flex items-center gap-3 px-6 border-b border-[#E2E8F0] bg-white">
            <div className="w-8 h-8 rounded-xl bg-[#4F46E5] flex items-center justify-center font-extrabold text-white text-xs shadow-md shadow-indigo-500/20">
              V
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-[#172033] block text-xs uppercase leading-none">
                Vendor Studio
              </span>
              <span className="text-[10px] text-[#4F46E5] font-bold uppercase tracking-wider mt-0.5 block">
                Print Partner Console
              </span>
            </div>
          </div>

          {/* Account Banner */}
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F1F5F9]/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Studio Context</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-[#4F46E5] border border-indigo-100">
                Vendor
              </span>
            </div>
            <div className="text-[#172033] font-bold text-xs truncate">
              {user?.full_name || user?.email}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.path || (item.path !== "/vendor" && pathname.startsWith(item.path));
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-[#4F46E5] text-white shadow-sm shadow-indigo-500/20 font-bold"
                      : "text-[#64748B] hover:text-[#172033] hover:bg-[#F1F5F9]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-[#E2E8F0] space-y-2 bg-white">
          {isSuper && (
            <Link
              href="/admin/production"
              className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Super Admin Console
            </Link>
          )}

          <Link
            href="/organization/students"
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition-all shadow-2xs"
          >
            <Building className="w-3.5 h-3.5" /> Organization Portal
          </Link>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5 truncate pr-2">
              <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center justify-center shrink-0 border border-amber-200">
                {initials}
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-slate-800 truncate">{user?.full_name}</div>
                <div className="text-[10px] text-slate-500 font-mono truncate">@{user?.username}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg transition-all"
              title="Log Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-2">
            <Badge variant="warning" className="bg-amber-100 text-amber-800 border-amber-200 font-medium">
              Vendor Studio
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono font-semibold text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              PRINT NETWORK ACTIVE
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 bg-slate-50/70">
          {children}
        </main>
      </div>
    </div>
  );
}
