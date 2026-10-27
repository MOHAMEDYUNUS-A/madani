"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Building2, 
  User, 
  Hash, 
  Calendar, 
  ArrowLeft,
  Clock,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface VerifyPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function VerifyDetailsPage({ params }: VerifyPageProps) {
  const resolvedParams = use(params);
  const token = resolvedParams.id;

  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.verifyCardPublic(token)
        .then(setResult)
        .catch(err => setError(err.message || "Failed to verify. Invalid token code."))
        .finally(() => setLoading(false));
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#172033] flex flex-col items-center justify-center px-6 selection:bg-indigo-100 selection:text-indigo-900 font-sans relative overflow-hidden">
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
            ANTI-COUNTERFEIT CHECK
          </div>
          <CardTitle className="text-xl font-extrabold text-[#172033]">Digital Credential Verification</CardTitle>
          <CardDescription className="text-xs text-[#64748B]">
            Token signature: <span className="font-mono text-[#4F46E5] font-bold">{token}</span>
          </CardDescription>
        </div>

        {loading ? (
          <div className="space-y-4 py-6">
            <Skeleton className="h-6 w-full bg-slate-200" />
            <Skeleton className="h-24 w-full bg-slate-200" />
            <div className="text-center text-[#64748B] text-xs">
              Verifying cryptographic digital signature against central ledger...
            </div>
          </div>
        ) : error ? (
          <div className="space-y-4 py-2">
            <div className="p-4 text-xs text-[#DC2626] bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0" />
              <div>
                <div className="font-bold">Verification Failed</div>
                <div className="text-[#DC2626]/80 mt-0.5">Invalid, expired, or unrecognized ID card signature token.</div>
              </div>
            </div>
            <Button asChild className="w-full text-xs font-bold border-[#E2E8F0]" variant="outline">
              <Link href="/verify">
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Verify Code Manually
              </Link>
            </Button>
          </div>
        ) : (
          <div className="p-5 bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl space-y-3.5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#059669]" /> Integrity Status
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-[#059669] border border-emerald-200 font-mono">
                {result.verification_mark || "VERIFIED GENUINE"}
              </span>
            </div>

            <div className="space-y-2 text-xs text-[#64748B]">
              <div className="flex justify-between">
                <span>Institution:</span>
                <span className="text-[#172033] font-bold">{result.organization_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Member Name:</span>
                <span className="text-[#172033] font-bold">{result.student_name}</span>
              </div>
              <div className="flex justify-between">
                <span>ID Code:</span>
                <span className="text-[#172033] font-mono font-semibold">{result.student_id}</span>
              </div>
              <div className="flex justify-between">
                <span>Designation / Class:</span>
                <span className="text-[#172033] font-medium">{result.class_name} - {result.section}</span>
              </div>
              <div className="flex justify-between">
                <span>Credential State:</span>
                <span className="text-[#059669] font-bold">{result.card_status}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#E2E8F0] text-[11px]">
                <span>Verified At:</span>
                <span className="text-[#64748B] font-mono">{new Date(result.verified_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
