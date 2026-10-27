"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { 
  Printer, 
  Building2, 
  Sparkles, 
  Building, 
  LogOut, 
  ShieldCheck,
  ChevronRight 
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMe()
      .then((data) => {
        const roles = data.roles || [];
        if (!roles.includes("SUPER_ADMIN")) {
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
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 text-xs font-semibold tracking-wider uppercase">Authenticating Super Admin...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { name: "Production & Fulfillment", path: "/admin/production", icon: Printer },
    { name: "Vendor Management & Tiers", path: "/admin/vendors", icon: Building2 },
  ];

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#172033] flex font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900">
      {/* Super Admin Executive Light Sidebar */}
      <aside className="w-64 border-r border-[#E2E8F0] bg-white flex flex-col justify-between shrink-0 shadow-xs z-10">
        <div>
          {/* Header */}
          <div className="h-16 border-b border-[#E2E8F0] flex items-center gap-3 px-6 bg-white">
            <div className="w-8 h-8 rounded-xl bg-[#4F46E5] flex items-center justify-center font-extrabold text-white text-xs shadow-md shadow-indigo-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-xs text-[#172033] uppercase block leading-none">
                Super Admin
              </span>
              <span className="text-[10px] text-[#4F46E5] font-bold uppercase tracking-wider mt-0.5 block">
                Command Console
              </span>
            </div>
          </div>

          {/* Admin Tag */}
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F1F5F9]/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Clearance</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-[#4F46E5] border border-indigo-100">
                Full Root
              </span>
            </div>
            <div className="text-[#172033] font-bold text-xs truncate">{user?.email}</div>
          </div>

          {/* Navigation */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.path);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? "bg-[#4F46E5] text-white shadow-sm shadow-indigo-500/20 font-bold"
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

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#E2E8F0] space-y-2 bg-white">
          <Link
            href="/vendor"
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 text-xs font-semibold transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" /> Vendor Studio Portal
          </Link>
          <Link
            href="/organization/students"
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-white hover:bg-slate-50 text-[#172033] border border-[#E2E8F0] text-xs font-semibold transition-all shadow-2xs"
          >
            <Building className="w-3.5 h-3.5" /> Organization Portal
          </Link>

          <div className="pt-2 flex items-center justify-between">
            <div className="text-[10px] text-[#64748B] truncate font-medium">
              {user?.full_name || "Super Admin"}
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-[#DC2626] hover:text-red-700 font-semibold transition-all flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-200 bg-white/80 flex items-center justify-between px-8 shrink-0 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Badge variant="purple" className="bg-purple-100 text-purple-800 border-purple-200">
              Cross-Tenant Governance Active
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
              CENTRAL AUDIT ENGINE ACTIVE
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
