"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { 
  ShieldCheck, 
  AlertCircle, 
  Search, 
  Building2, 
  QrCode,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function PublicVerifyPage() {
  const [token, setToken] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await api.verifyCardPublic(token.trim());
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Invalid token code. Verify card signature integrity.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#172033] flex flex-col items-center justify-center px-6 selection:bg-indigo-100 selection:text-indigo-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(#E2E8F0_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none" />

      <Link href="/" className="flex items-center gap-3 mb-8 hover:opacity-90 transition-all relative z-10">
        <div className="w-10 h-10 rounded-xl bg-[#4F46E5] flex items-center justify-center font-extrabold text-white shadow-md shadow-indigo-500/20 text-base">
          M
        </div>
        <div>
          <span className="font-extrabold tracking-tight text-base text-[#172033] uppercase block leading-none">
            Madani ID Platform
          </span>
          <span className="text-[11px] text-[#64748B] font-semibold uppercase tracking-wider mt-1 block">
            Cryptographic Registry
          </span>
        </div>
      </Link>

      <Card className="w-full max-w-md bg-white border-[#E2E8F0] shadow-xl shadow-slate-200/50 relative z-10 p-6 space-y-6 rounded-2xl">
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[#059669] text-[11px] font-bold mx-auto mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            ANTI-COUNTERFEIT VERIFICATION
          </div>
          <CardTitle className="text-xl font-extrabold text-[#172033]">Public Credential Registry</CardTitle>
          <CardDescription className="text-xs text-[#64748B]">
            Verify issued student or staff ID cards by entering the cryptographic signature token.
          </CardDescription>
        </div>

        {error && (
          <div className="p-3.5 text-xs text-[#DC2626] bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-[#172033] uppercase tracking-wider mb-1.5">
              ID Verification Code
            </label>
            <Input 
              type="text" 
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="font-mono text-center text-sm bg-white border-[#E2E8F0] text-[#172033] placeholder:text-[#64748B] focus-visible:ring-[#818CF8]"
              placeholder="e.g. MAD-8FA9BC725E"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-xs h-10 rounded-xl shadow-md shadow-indigo-500/20"
          >
            {loading ? "Verifying Token..." : "Verify Code Integrity"}
          </Button>
        </form>

        {result && (
          <div className="p-5 bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl space-y-3.5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#059669]" /> Integrity Status
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-[#059669] border border-emerald-200 font-mono">
                {result.verification_mark || "GENUINE"}
              </span>
            </div>

            <div className="space-y-2 text-xs text-[#64748B]">
              <div className="flex justify-between">
                <span>Organization:</span>
                <span className="text-[#172033] font-bold">{result.organization_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Student Name:</span>
                <span className="text-[#172033] font-bold">{result.student_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Student ID:</span>
                <span className="text-[#172033] font-mono font-semibold">{result.student_id}</span>
              </div>
              <div className="flex justify-between">
                <span>Class / Department:</span>
                <span className="text-[#172033] font-medium">{result.class_name} - {result.section}</span>
              </div>
              <div className="flex justify-between">
                <span>Current Status:</span>
                <span className="text-[#059669] font-bold">{result.card_status}</span>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
