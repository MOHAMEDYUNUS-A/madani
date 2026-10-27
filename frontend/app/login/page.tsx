"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { 
  ShieldAlert, 
  Building2, 
  Building, 
  AlertCircle, 
  ArrowRight, 
  Lock, 
  User,
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

      // Smart role routing
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
      setError(err.message || "Invalid credentials. Please check your username and password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#172033] flex flex-col justify-center items-center px-6 py-12 relative overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#E2E8F0_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none" />

      {/* Brand Header */}
      <Link href="/" className="flex items-center gap-3 mb-8 hover:opacity-90 transition-all relative z-10">
        <div className="w-11 h-11 rounded-xl bg-[#4F46E5] flex items-center justify-center font-black text-white shadow-md shadow-indigo-500/20 text-lg">
          M
        </div>
        <div>
          <span className="font-extrabold tracking-tight text-base text-[#172033] uppercase block leading-none">
            Madani ID Platform
          </span>
          <span className="text-[11px] text-[#64748B] font-semibold uppercase tracking-wider mt-1 block">
            Enterprise Identity & Fulfillment
          </span>
        </div>
      </Link>

      <Card className="w-full max-w-md bg-white border-[#E2E8F0] shadow-xl shadow-slate-200/50 relative z-10 rounded-2xl">
        <CardHeader className="text-center pb-3 pt-6">
          <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-bold mx-auto mb-2.5">
            <Lock className="w-3.5 h-3.5" />
            SECURE PORTAL LOGIN
          </div>
          <CardTitle className="text-xl font-extrabold text-[#172033]">Welcome Back</CardTitle>
          <CardDescription className="text-xs text-[#64748B] mt-1">
            Sign in to access your designated workflow portal
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 px-6 pb-6">
          {/* Quick Demo Login Preset Helper */}
          <div className="p-3 bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block text-center">
              Quick Role Test Credentials
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill("superadmin", "superpass123")}
                className="p-2 rounded-lg bg-white border border-[#E2E8F0] text-[11px] font-bold text-[#172033] hover:border-indigo-400 hover:text-indigo-600 transition-all flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-indigo-600" /> Super Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("rohan_apex", "SecretPassword123!")}
                className="p-2 rounded-lg bg-white border border-[#E2E8F0] text-[11px] font-bold text-[#172033] hover:border-indigo-400 hover:text-indigo-600 transition-all flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Vendor
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("alice_admin", "password123")}
                className="p-2 rounded-lg bg-white border border-[#E2E8F0] text-[11px] font-bold text-[#172033] hover:border-indigo-400 hover:text-indigo-600 transition-all flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Building className="w-3.5 h-3.5 text-indigo-600" /> Org Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("priya_staff", "staffpass123")}
                className="p-2 rounded-lg bg-white border border-[#E2E8F0] text-[11px] font-bold text-[#172033] hover:border-indigo-400 hover:text-indigo-600 transition-all flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <User className="w-3.5 h-3.5 text-indigo-600" /> Class Staff
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 text-xs text-[#DC2626] bg-red-50 border border-red-200 rounded-xl font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#172033] uppercase tracking-wider block">
                Username or Email
              </label>
              <Input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. rohan_apex"
                className="bg-white border-[#E2E8F0] text-[#172033] placeholder:text-[#64748B] focus-visible:ring-[#818CF8]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#172033] uppercase tracking-wider block">
                Password
              </label>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-white border-[#E2E8F0] text-[#172033] placeholder:text-[#64748B] focus-visible:ring-[#818CF8]"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 text-xs font-bold bg-[#4F46E5] hover:bg-[#4338CA] text-white shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 rounded-xl transition-all"
            >
              {loading ? (
                "Authenticating..."
              ) : (
                <>
                  Sign In to Workspace
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col gap-2 text-center text-xs text-[#64748B] border-t border-[#E2E8F0] pt-4 pb-6 px-6 bg-slate-50/50 rounded-b-2xl">
          <div>
            Need to register a new school or college?{" "}
            <Link href="/register" className="text-[#4F46E5] hover:text-[#4338CA] font-bold hover:underline">
              Register Organization
            </Link>
          </div>
          <div>
            Have an invitation token?{" "}
            <Link href="/activate-vendor" className="text-[#4F46E5] hover:text-[#4338CA] font-bold hover:underline">
              Activate Account
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
