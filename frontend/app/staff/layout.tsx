"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { 
  GraduationCap, 
  Users, 
  LogOut, 
  ShieldCheck, 
  Sparkles,
  Send
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Loading Staff Portal...</p>
        </div>
      </div>
    );
  }

  const assignedClass = user?.assigned_class || "All Permitted Classes";

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans antialiased text-slate-800">
      {/* Top Application Bar */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 sm:px-8 flex items-center justify-between shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white text-xs shadow-md shadow-indigo-600/15">
            M
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-slate-900 uppercase tracking-tight">Madani Staff Portal</span>
              <Badge variant="default">Class Operator</Badge>
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Assigned Cohort: <span className="font-semibold text-indigo-600">{assignedClass}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user?.roles?.includes("SUPER_ADMIN") && (
            <Link
              href="/admin/production"
              className="text-xs text-purple-700 hover:text-purple-900 font-semibold px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-200"
            >
              Super Admin
            </Link>
          )}

          {(user?.roles?.includes("ORGANIZATION_ADMIN") || user?.roles?.includes("SUPER_ADMIN")) && (
            <Link
              href="/organization"
              className="text-xs text-indigo-700 hover:text-indigo-900 font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200"
            >
              Org Admin Console
            </Link>
          )}

          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-800">{user?.full_name}</div>
              <div className="text-[10px] text-slate-400 font-mono">@{user?.username}</div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
