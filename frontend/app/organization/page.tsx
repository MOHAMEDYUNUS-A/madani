"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ProductionMetricsSummary } from "@/lib/api";
import { 
  Users, 
  GraduationCap, 
  UserCheck, 
  FileCheck2, 
  Layers, 
  Package, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Truck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function OrganizationDashboardPage() {
  const [metrics, setMetrics] = useState<ProductionMetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getProductionMetricsSummary()
      .then(data => {
        setMetrics(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err?.message || "Failed to load dashboard metrics");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        Loading Organization Console...
      </div>
    );
  }

  const orgMetrics = metrics?.organization_metrics || {
    total_classes: 0,
    total_staff: 0,
    total_members: 0,
    draft_members: 0,
    submitted_members: 0,
    approved_members: 0,
    missing_photos: 0,
    design_awaiting_approval: 0,
    batches_approved: 0,
    active_print_jobs: 0
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Institution Control Center</h1>
          <p className="text-xs text-slate-500 mt-1">
            Oversee class divisions, staff assignments, student records, and ID card approval milestones.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success">All Systems Operational</Badge>
          <span className="text-xs text-slate-400 font-mono">Live Data</span>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Row 1: Core Institutional Roster Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link 
          href="/organization/classes" 
          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Classes &amp; Sections</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{orgMetrics.total_classes}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Manage cohorts</span>
            <ArrowRight className="w-3 h-3 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link 
          href="/organization/staff" 
          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Staff Accounts</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{orgMetrics.total_staff}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Class-scoped operators</span>
            <ArrowRight className="w-3 h-3 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link 
          href="/organization/students" 
          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Students</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{orgMetrics.total_members}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            {orgMetrics.approved_members} approved for production
          </div>
        </Link>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Missing Photos</span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              orgMetrics.missing_photos > 0 ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-400"
            }`}>
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black mt-2 ${
            orgMetrics.missing_photos > 0 ? "text-amber-600" : "text-slate-900"
          }`}>
            {orgMetrics.missing_photos}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {orgMetrics.missing_photos > 0 ? "Requires staff photo upload" : "All photos complete"}
          </div>
        </div>
      </div>

      {/* Row 2: Workflow Milestones Progress */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
          Production Milestone Pipeline
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Step 1: Staff Data Entry */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Stage 1</span>
                <Badge variant={orgMetrics.submitted_members > 0 ? "default" : "secondary"}>
                  {orgMetrics.submitted_members > 0 ? "Review Needed" : "In Progress"}
                </Badge>
              </div>
              <h3 className="text-xs font-bold text-slate-800">Student Data Entry</h3>
              <p className="text-[11px] text-slate-500 mt-1">
                {orgMetrics.draft_members} in draft, {orgMetrics.submitted_members} submitted by staff awaiting review.
              </p>
            </div>
            <Link 
              href="/organization/students" 
              className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>Review records</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Step 2: Design Approval */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Stage 2</span>
                <Badge variant={orgMetrics.design_awaiting_approval > 0 ? "warning" : "success"}>
                  {orgMetrics.design_awaiting_approval > 0 ? "Pending Decision" : "Approved"}
                </Badge>
              </div>
              <h3 className="text-xs font-bold text-slate-800">Card Design Approval</h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Vendor creates card layout. Organization previews and signs off.
              </p>
            </div>
            <Link 
              href="/organization/design-review" 
              className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>Inspect layout</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Step 3: Final Batch Freeze */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Stage 3</span>
                <Badge variant={orgMetrics.batches_approved > 0 ? "success" : "secondary"}>
                  {orgMetrics.batches_approved > 0 ? `${orgMetrics.batches_approved} Frozen` : "Not Frozen"}
                </Badge>
              </div>
              <h3 className="text-xs font-bold text-slate-800">Final Batch Verification</h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Lock demographic records and approved design into an immutable snapshot.
              </p>
            </div>
            <Link 
              href="/organization/batch-review" 
              className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>Batch freeze gate</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Step 4: Factory Production Tracking */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Stage 4</span>
                <Badge variant={orgMetrics.active_print_jobs > 0 ? "default" : "secondary"}>
                  {orgMetrics.active_print_jobs} In Production
                </Badge>
              </div>
              <h3 className="text-xs font-bold text-slate-800">Manufacturing &amp; Dispatch</h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Centralized production managed by Super Admin and monitored read-only.
              </p>
            </div>
            <Link 
              href="/organization/orders" 
              className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>Track physical jobs</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
