"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/lib/api";
import { 
  Lock, 
  User, 
  ArrowRight, 
  AlertCircle, 
  ShieldCheck,
  ChevronDown,
  Building2,
  Building,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDemoLogins, setShowDemoLogins] = useState(false);

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      await api.login({ username, password });
      const me = await api.getMe();
      const roles = me.roles || [];

      // Smart single-auth routing based on verified role
      if (roles.includes("SUPER_ADMIN")) {
        router.push("/admin/production");
      } else if (roles.includes("VENDOR")) {
        router.push("/vendor");
      } else if (roles.includes("STAFF") || roles.includes("DATA_ENTRY_STAFF")) {
        router.push("/staff");
      } else {
        router.push("/organization");
      }
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please verify your username and password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col justify-center items-center px-4 sm:px-6 py-10 relative overflow-hidden font-sans">
      {/* Background Decorative Gradient Rings */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-emerald-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-green-200/30 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header with Generated App Icon */}
      <div className="flex flex-col items-center mb-8 text-center relative z-10">
        <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg shadow-emerald-900/10 border-2 border-[#4ADE80] mb-4 bg-white flex items-center justify-center">
          <Image 
            src="/madani_enterprises_app_icon.png" 
            alt="Madani Enterprises App Icon" 
            width={80} 
            height={80} 
            priority
            className="w-full h-full object-cover"
          />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#14532D] tracking-tight">
          Madani ID Platform
        </h1>
        <p className="text-sm font-semibold text-slate-600 mt-1 max-w-sm">
          Madani Enterprises &bull; Enterprise ID Card Management
        </p>
      </div>

      {/* Single Authentication Card */}
      <div className="w-full max-w-md bg-white border border-slate-200 shadow-xl shadow-emerald-950/5 rounded-2xl relative z-10 overflow-hidden">
        {/* Top High-Contrast Accent Strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#14532D] via-[#15803D] to-[#4ADE80]" />

        <div className="p-6 sm:p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-slate-900">
              Account Sign In
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter your credentials to access your designated workspace
            </p>
          </div>

          {error && (
            <div className="p-3.5 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl font-semibold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Username or Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <Input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username or email"
                  className="pl-10 h-12 bg-white border-slate-300 text-slate-900 text-sm placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#4ADE80] focus-visible:border-[#15803D] rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter account password"
                  className="pl-10 h-12 bg-white border-slate-300 text-slate-900 text-sm placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#4ADE80] focus-visible:border-[#15803D] rounded-xl"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-sm font-bold bg-[#15803D] hover:bg-[#14532D] text-white shadow-md shadow-emerald-900/15 flex items-center justify-center gap-2 rounded-xl transition-all cursor-pointer"
            >
              {loading ? (
                "Verifying credentials..."
              ) : (
                <>
                  Sign In to Workspace
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Clean Demo Fill Selector (Collapsible so it doesn't clutter the single auth experience) */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowDemoLogins(!showDemoLogins)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 hover:text-slate-800 py-1"
            >
              <span>Quick Test Credentials</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDemoLogins ? "rotate-180" : ""}`} />
            </button>

            {showDemoLogins && (
              <div className="mt-2.5 grid grid-cols-2 gap-2 animate-in fade-in-50">
                <button
                  type="button"
                  onClick={() => handleQuickFill("superadmin", "superpass123")}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 text-xs font-bold text-slate-800 hover:text-[#15803D] hover:border-emerald-300 flex items-center gap-2 transition-all"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" /> Super Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill("rohan_apex", "SecretPassword123!")}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 text-xs font-bold text-slate-800 hover:text-[#15803D] hover:border-emerald-300 flex items-center gap-2 transition-all"
                >
                  <Building2 className="w-3.5 h-3.5 text-emerald-700" /> Vendor Studio
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill("alice_admin", "password123")}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 text-xs font-bold text-slate-800 hover:text-[#15803D] hover:border-emerald-300 flex items-center gap-2 transition-all"
                >
                  <Building className="w-3.5 h-3.5 text-emerald-700" /> Org Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill("priya_staff", "staffpass123")}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 text-xs font-bold text-slate-800 hover:text-[#15803D] hover:border-emerald-300 flex items-center gap-2 transition-all"
                >
                  <Users className="w-3.5 h-3.5 text-emerald-700" /> Class Staff
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Card Footer Links */}
        <div className="flex flex-col gap-1.5 text-center text-xs text-slate-500 border-t border-slate-100 py-4 px-6 bg-slate-50/60">
          <div>
            Registering a new institution?{" "}
            <Link href="/register" className="text-[#15803D] hover:text-[#14532D] font-bold hover:underline">
              Register Organization
            </Link>
          </div>
          <div>
            Have an invitation token?{" "}
            <Link href="/activate-vendor" className="text-[#15803D] hover:text-[#14532D] font-bold hover:underline">
              Activate Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
