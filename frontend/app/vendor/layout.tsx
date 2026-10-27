"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { api } from "@/lib/api";
import { 
  Building2, 
  Sparkles, 
  CheckCircle2, 
  Printer, 
  CreditCard, 
  Settings, 
  LogOut, 
  ChevronRight,
  Menu,
  X
} from "lucide-react";
import { AppMenuBar } from "@/components/layout/AppMenuBar";

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    try {
      await api.logout();
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  const menuItems = [
    { name: "Dashboard Overview", path: "/vendor", icon: Building2 },
    { name: "Client Organizations", path: "/vendor/organizations", icon: Building2 },
    { name: "AI Design Studio", path: "/vendor/ai-studio", icon: Sparkles },
    { name: "Batch Verification", path: "/vendor/batch-validation", icon: CheckCircle2 },
    { name: "Print Production", path: "/vendor/production", icon: Printer },
    { name: "Subscription & Billing", path: "/vendor/billing", icon: CreditCard },
    { name: "Studio Settings", path: "/vendor/settings", icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#15803D] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 text-sm font-semibold tracking-wider uppercase">Loading Vendor Studio...</p>
        </div>
      </div>
    );
  }

  const initials = (user?.full_name || "Vendor")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col md:flex-row font-sans antialiased">
      {/* Mobile Top Bar */}
      <div className="md:hidden h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-emerald-300">
            <Image 
              src="/madani_enterprises_app_icon.png" 
              alt="Madani Enterprises" 
              width={32} 
              height={32} 
              className="w-full h-full object-cover"
            />
          </div>
          <span className="font-extrabold text-sm tracking-tight text-[#14532D] uppercase">
            Vendor Studio
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

      {/* Sidebar */}
      <aside className={`
        ${mobileMenuOpen ? "fixed inset-y-0 left-0 z-50 w-72 flex" : "hidden"} 
        md:flex md:w-64 border-r border-slate-200 bg-white flex-col justify-between shrink-0 shadow-xs md:sticky md:top-0 md:h-screen
      `}>
        <div className="overflow-y-auto">
          {/* Logo / Header */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200 bg-white">
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
                <span className="font-extrabold tracking-tight text-sm text-[#14532D] block uppercase leading-none">
                  Madani Studio
                </span>
                <span className="text-[11px] text-[#15803D] font-bold uppercase tracking-wider mt-1 block">
                  Vendor Partner
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

          {/* Account Banner */}
          <div className="p-4 border-b border-slate-200 bg-emerald-50/30">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Studio Context</span>
            <div className="text-slate-900 font-extrabold text-sm truncate">
              {user?.full_name || user?.email}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5">
            {menuItems.map((item) => {
              const isActive = pathname === item.path || (item.path !== "/vendor" && pathname.startsWith(item.path));
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-[#15803D] text-white font-bold shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 text-white/90" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer actions - clean without cross-portal overlap */}
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

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <AppMenuBar 
          portalTitle="Vendor Command Studio" 
          roleBadge="Vendor Partner" 
          user={user} 
          onLogout={handleLogout} 
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#F8FAFC]">
          {children}
        </main>
      </div>
    </div>
  );
}
