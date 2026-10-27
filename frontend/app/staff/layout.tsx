"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { 
  GraduationCap, 
  Users, 
  LogOut, 
  CheckCircle2
} from "lucide-react";

export default function StaffPortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
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
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#15803D] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 text-sm font-semibold uppercase tracking-wider">Loading Staff Portal...</p>
        </div>
      </div>
    );
  }

  const assignedClass = user?.assigned_class || "All Permitted Classes";

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans antialiased text-slate-900">
      {/* Top Application Bar */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between shadow-xs sticky top-0 z-30">
        <div className="flex items-center gap-3.5">
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
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-[#14532D] uppercase tracking-tight">Madani Staff Portal</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#15803D] border border-emerald-200">
                Class Operator
              </span>
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Assigned Cohort: <span className="font-bold text-[#15803D]">{assignedClass}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 pl-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-900">{user?.full_name}</div>
              <div className="text-[11px] text-slate-500 font-mono">@{user?.username}</div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
