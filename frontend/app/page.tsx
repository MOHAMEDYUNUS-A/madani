"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { 
  ShieldCheck, 
  ArrowRight, 
  Building2, 
  Building, 
  Shield, 
  User, 
  Sparkles, 
  Layers, 
  CheckCircle2, 
  Printer, 
  FileCheck2,
  Lock
} from "lucide-react";

export default function Home() {
  const [activeCardSide, setActiveCardSide] = useState<"front" | "back">("front");

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#172033] font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-[#E2E8F0] bg-white/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-emerald-300 shadow-sm">
              <img 
                src="/madani_enterprises_app_icon.png" 
                alt="Madani Enterprises" 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-sm text-[#14532D] uppercase block leading-none">
                Madani ID Platform
              </span>
              <span className="text-[10px] text-[#15803D] font-bold uppercase tracking-wider block mt-0.5">
                Enterprise ID & Production Cloud
              </span>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600">
            <a href="#workflow" className="hover:text-[#15803D] transition-colors">How It Works</a>
            <a href="#features" className="hover:text-[#15803D] transition-colors">Platform Capabilities</a>
            <a href="#portals" className="hover:text-[#15803D] transition-colors">Role Portals</a>
            <Link href="/verify" className="hover:text-[#15803D] transition-colors flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#15803D]" /> QR Verification
            </Link>
          </nav>
          
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-xs font-semibold text-slate-700 hover:bg-slate-100">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="bg-[#15803D] hover:bg-[#14532D] text-white text-xs font-bold rounded-xl shadow-xs">
                Register Institution
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 border-b border-[#E2E8F0] bg-gradient-to-b from-white to-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[#14532D] text-xs font-bold mb-6">
            <Sparkles className="w-3.5 h-3.5 text-[#15803D]" />
            ENTERPRISE PVC ID CARD MANAGEMENT & PHYSICAL PRINT FULFILLMENT
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[#14532D] mb-6 max-w-4xl leading-[1.15]">
            Unified ID Card Studio, Approvals &{" "}
            <span className="text-[#15803D]">
              Physical Print Pipeline
            </span>
          </h1>
          
          <p className="max-w-2xl text-slate-600 text-sm sm:text-base mb-10 leading-relaxed font-normal">
            Multi-role SaaS connecting <strong className="text-slate-900">Super Admins</strong>, <strong className="text-slate-900">Design Vendors</strong>, and <strong className="text-slate-900">Schools & Universities</strong>. Generate branded concepts, collect student rosters, lock immutable snapshots, and dispatch verified PVC print runs.
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-3 mb-14">
            <Link href="/login">
              <Button size="lg" className="bg-[#15803D] hover:bg-[#14532D] text-white text-xs font-bold px-7 h-11 rounded-xl shadow-md shadow-emerald-900/15 flex items-center gap-2">
                Launch Platform Portal <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/verify">
              <Button variant="outline" size="lg" className="text-xs font-semibold px-6 h-11 border-slate-300 bg-white text-slate-800 hover:bg-slate-100 rounded-xl flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#15803D]" /> Public QR Verification Demo
              </Button>
            </Link>
          </div>

          {/* Interactive Live CR80 Badge Showcase Card */}
          <div className="w-full max-w-3xl p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-xl shadow-slate-200/50">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
              <div className="text-left">
                <span className="text-[10px] font-bold text-[#4F46E5] uppercase tracking-wider block">
                  PHYSICAL CR80 PVC PREVIEW
                </span>
                <span className="text-xs text-[#172033] font-semibold">Standard 3.375&quot; × 2.125&quot; • 300 DPI Imposition Ready</span>
              </div>
              <div className="flex items-center gap-1.5 p-1 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0]">
                <button
                  onClick={() => setActiveCardSide("front")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeCardSide === "front"
                      ? "bg-white text-[#172033] shadow-xs"
                      : "text-[#64748B] hover:text-[#172033]"
                  }`}
                >
                  Front Side
                </button>
                <button
                  onClick={() => setActiveCardSide("back")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeCardSide === "back"
                      ? "bg-white text-[#172033] shadow-xs"
                      : "text-[#64748B] hover:text-[#172033]"
                  }`}
                >
                  Back Side (Duplex)
                </button>
              </div>
            </div>

            {/* Simulated Badge Card */}
            <div className="py-8 flex justify-center items-center">
              {activeCardSide === "front" ? (
                <div className="w-[340px] h-[215px] rounded-2xl bg-gradient-to-tr from-indigo-900 via-indigo-950 to-slate-900 border border-indigo-400/30 p-5 shadow-2xl relative overflow-hidden flex flex-col justify-between text-left animate-fade-in text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[9px] font-black tracking-widest uppercase text-amber-300">
                        MADANI ACADEMY OF TECHNOLOGY
                      </div>
                      <div className="text-[8px] text-slate-300">ACADEMIC YEAR 2026-2027</div>
                    </div>
                    <div className="w-6 h-6 rounded-lg bg-amber-400 text-black flex items-center justify-center font-black text-xs">
                      M
                    </div>
                  </div>

                  <div className="flex items-center gap-4 my-auto">
                    <div className="w-16 h-20 rounded-xl bg-slate-800/80 border-2 border-indigo-300/40 flex items-center justify-center text-[10px] text-slate-400 font-bold overflow-hidden">
                      <User className="w-8 h-8 text-indigo-300" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-xs font-black text-white">AARAV SHARMA</div>
                      <div className="text-[10px] text-indigo-200 font-mono font-bold">ID: MAD-2026-0891</div>
                      <div className="text-[9px] text-slate-300">DEPT: ARTIFICIAL INTELLIGENCE</div>
                      <div className="text-[9px] text-emerald-400 font-bold">BLOOD GRP: O+ VE</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[8px] text-slate-300 font-mono">
                    <span>STATUS: VERIFIED ACTIVE</span>
                    <span className="text-amber-300 font-bold">IMMUTABLE SNAPSHOT #BS-0091</span>
                  </div>
                </div>
              ) : (
                <div className="w-[340px] h-[215px] rounded-2xl bg-white border border-[#E2E8F0] p-5 shadow-2xl relative overflow-hidden flex flex-col justify-between text-left animate-fade-in text-[#172033]">
                  <div>
                    <div className="text-[9px] font-bold text-[#172033] uppercase">Emergency Contact & Official Terms</div>
                    <div className="text-[8px] text-[#64748B] leading-tight mt-1">
                      This badge is official property of Madani Academy. If found, please return to the Principal Office, Tech Campus, Bangalore.
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-[8px] text-[#64748B] font-mono">HELPLINE: +91 80 2345 6789</div>
                      <div className="text-[8px] text-[#64748B] font-mono">WEB: www.madani.edu</div>
                      <div className="text-[7px] text-[#64748B] font-mono">BARCODE: *MAD0891*</div>
                    </div>
                    <div className="w-16 h-16 bg-[#F1F5F9] border border-[#E2E8F0] p-1 rounded-lg flex items-center justify-center text-slate-800 font-mono text-[7px] font-bold text-center">
                      QR CODE<br/>VERIFIED
                    </div>
                  </div>

                  <div className="text-[7px] text-center text-[#64748B] font-mono pt-1 border-t border-[#E2E8F0]">
                    CRYPTOGRAPHICALLY SIGNED • DUPLEX MIRRORED ALIGNMENT
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Production Workflow Section */}
      <section id="workflow" className="py-20 max-w-7xl mx-auto px-6 border-b border-[#E2E8F0]">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-bold mb-2">
            END-TO-END WORKFLOW
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#172033]">
            Unbroken Production Pipeline
          </h2>
          <p className="text-[#64748B] text-xs md:text-sm max-w-lg mx-auto mt-1">
            From vendor brief generation to courier delivery, every step is tenant-isolated, audited, and immutable.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <Card className="bg-white border-[#E2E8F0] shadow-sm hover:shadow-md transition-all">
            <CardHeader className="p-5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-[#4F46E5] font-black text-sm flex items-center justify-center mb-3">
                1
              </div>
              <CardTitle className="text-sm font-bold text-[#172033]">Vendor Design Studio</CardTitle>
              <CardDescription className="text-xs text-[#64748B] leading-relaxed mt-1">
                Print vendor inputs institutional brief, uploads school assets, and creates multiple vector design concepts.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white border-[#E2E8F0] shadow-sm hover:shadow-md transition-all">
            <CardHeader className="p-5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-[#4F46E5] font-black text-sm flex items-center justify-center mb-3">
                2
              </div>
              <CardTitle className="text-sm font-bold text-[#172033]">School Design Approval</CardTitle>
              <CardDescription className="text-xs text-[#64748B] leading-relaxed mt-1">
                School administrators review side-by-side card variations in 3D, request revisions, or click &quot;Approve&quot;.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white border-[#E2E8F0] shadow-sm hover:shadow-md transition-all">
            <CardHeader className="p-5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-[#4F46E5] font-black text-sm flex items-center justify-center mb-3">
                3
              </div>
              <CardTitle className="text-sm font-bold text-[#172033]">Roster Entry & Batch Freeze</CardTitle>
              <CardDescription className="text-xs text-[#64748B] leading-relaxed mt-1">
                Staff enter student photos and records. School verifies class gallery and freezes the immutable print batch.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white border-[#E2E8F0] shadow-sm hover:shadow-md transition-all">
            <CardHeader className="p-5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-[#4F46E5] font-black text-sm flex items-center justify-center mb-3">
                4
              </div>
              <CardTitle className="text-sm font-bold text-[#172033]">Press & QC Dispatch</CardTitle>
              <CardDescription className="text-xs text-[#64748B] leading-relaxed mt-1">
                Super Admin routes to printing presses, records multi-point QC audits, and logs courier tracking numbers.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Role Portals Direct Jump Section */}
      <section id="portals" className="py-20 max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-bold mb-2">
            ROLE-BASED GOVERNANCE
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#172033]">
            Dedicated Portals for Every Stakeholder
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Vendor Portal */}
          <Card className="bg-white border-[#E2E8F0] shadow-md hover:border-indigo-300 transition-all">
            <CardHeader className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="p-2.5 bg-indigo-50 text-[#4F46E5] rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  VENDOR STUDIO
                </span>
              </div>
              <CardTitle className="text-base font-bold text-[#172033]">Print Vendors & Studios</CardTitle>
              <CardDescription className="text-xs text-[#64748B] leading-relaxed mt-1">
                Onboarding wizard, multiple design concept gallery, client management, readiness validation, and print submission.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0">
              <Link href="/vendor">
                <Button className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold h-10 rounded-xl">
                  Enter Vendor Portal
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Org Workspace */}
          <Card className="bg-white border-[#E2E8F0] shadow-md hover:border-indigo-300 transition-all">
            <CardHeader className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="p-2.5 bg-indigo-50 text-[#4F46E5] rounded-xl flex items-center justify-center">
                  <Building className="w-5 h-5" />
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  INSTITUTION TENANT
                </span>
              </div>
              <CardTitle className="text-base font-bold text-[#172033]">Schools, Colleges & Orgs</CardTitle>
              <CardDescription className="text-xs text-[#64748B] leading-relaxed mt-1">
                Class assignments, student records, 3D card showcase, missing data verification, and final batch approval.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0">
              <Link href="/organization/students">
                <Button className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold h-10 rounded-xl">
                  Enter Organization Workspace
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Super Admin */}
          <Card className="bg-white border-[#E2E8F0] shadow-md hover:border-indigo-300 transition-all">
            <CardHeader className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="p-2.5 bg-indigo-50 text-[#4F46E5] rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  SUPER ADMIN
                </span>
              </div>
              <CardTitle className="text-base font-bold text-[#172033]">Platform Super Admin</CardTitle>
              <CardDescription className="text-xs text-[#64748B] leading-relaxed mt-1">
                Centralized print queue, production state controller, quality control audits, courier dispatch tracking, and vendor governance.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0">
              <Link href="/admin/production">
                <Button variant="outline" className="w-full border-[#E2E8F0] text-[#172033] hover:bg-[#F1F5F9] text-xs font-bold h-10 rounded-xl">
                  Enter Admin Console
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] bg-white py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-[#64748B]">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-[#4F46E5] text-white font-extrabold flex items-center justify-center text-xs">
              M
            </div>
            <span>© 2026 Madani ID Platform. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/verify" className="hover:text-[#4F46E5] transition-colors">
              Anti-Counterfeit QR Verification
            </Link>
            <Link href="/login" className="hover:text-[#4F46E5] transition-colors">
              Staff Sign In
            </Link>
            <Link href="/register" className="hover:text-[#4F46E5] transition-colors">
              Register New Organization
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
