"use client";

import { useEffect, useState } from "react";
import { api, Member, DesignProject, BatchSnapshot } from "@/lib/api";
import { 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  ShieldCheck, 
  FileCheck2, 
  Users, 
  Camera, 
  ArrowRight,
  Lock,
  Sparkles,
  Info,
  Calendar,
  Eye
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function BatchReviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [projects, setProjects] = useState<DesignProject[]>([]);
  const [existingSnapshots, setExistingSnapshots] = useState<BatchSnapshot[]>([]);

  const [confirmed, setConfirmed] = useState(false);
  const [approving, setApproving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [mList, pList, sList] = await Promise.all([
        api.getMembers({}),
        api.getDesignProjects().catch(() => []),
        api.getBatchSnapshots().catch(() => [])
      ]);
      setMembers(Array.isArray(mList) ? mList : mList?.results || []);
      setProjects(pList || []);
      setExistingSnapshots(sList || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load batch review data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Approved design project
  const approvedProject = projects.find(p => p.status?.toLowerCase() === "approved") || projects[0] || null;
  const latestSnapshot = existingSnapshots[0] || null;

  // Compute metrics
  const totalStudents = members.length;
  const approvedStudents = members.filter(m => m.status === "APPROVED").length;
  const missingPhotos = members.filter(m => !m.photo_url).length;

  // Class-wise breakdown
  const classBreakdown = members.reduce((acc: Record<string, number>, m) => {
    const cls = m.class_grade || "Unassigned";
    acc[cls] = (acc[cls] || 0) + 1;
    return acc;
  }, {});

  const handleApproveBatch = async () => {
    if (!approvedProject) {
      setError("An approved card design project is required before batch approval.");
      return;
    }
    if (totalStudents === 0) {
      setError("Cannot freeze an empty student batch.");
      return;
    }
    if (!confirmed) {
      setError("Please check the confirmation box to verify the batch snapshot.");
      return;
    }

    try {
      setApproving(true);
      setError(null);
      await api.createBatchSnapshot({
        design_project_id: approvedProject.id
      });
      setSuccess("Final Batch Approved and Frozen. Your vendor has been notified for physical print validation.");
      setConfirmed(false);
      await fetchData();
    } catch (err: any) {
      setError(err?.message || "Failed to approve final batch.");
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs">
        <div className="w-8 h-8 border-2 border-[#15803D] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        Compiling batch inspection data...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Badge variant="default">Step 4 of 5</Badge>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Production Readiness Gate
          </span>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-1">Final Batch Verification & Freeze</h1>
        <p className="text-xs text-slate-500 mt-1">
          Review all student demographic records and approved design version. Freezing creates an immutable production snapshot for vendor validation.
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Latest Frozen Snapshot Banner if already approved */}
      {latestSnapshot && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-emerald-950">Active Frozen Production Snapshot</h3>
                  <Badge variant="success">FROZEN & IMMUTABLE</Badge>
                </div>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Snapshot #{latestSnapshot.snapshot_number} &bull; Locked on {new Date(latestSnapshot.created_at).toLocaleDateString()} with {latestSnapshot.total_cards} verified ID cards.
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-100 px-2 py-1 rounded-md">
                Status: {latestSnapshot.status}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-emerald-200/60 flex flex-wrap items-center justify-between text-xs text-emerald-800">
            <span>Workflow Hand-off: Your vendor is conducting print-readiness validation to submit the physical job to Super Admin.</span>
          </div>
        </div>
      )}

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Design & Batch Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Approved Design Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <FileCheck2 className="w-4 h-4 text-[#15803D]" />
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Associated Design Template
                </h2>
              </div>
              {approvedProject ? (
                <Badge variant="success">DESIGN APPROVED</Badge>
              ) : (
                <Badge variant="destructive">NO APPROVED DESIGN</Badge>
              )}
            </div>

            {approvedProject ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-xs">{approvedProject.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Layout: {approvedProject.orientation || "Portrait"} &bull; Dimensions: CR80 Standard (85.6mm &times; 54.0mm)
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-[#15803D]">Active Approved Suite</div>
                  <div className="text-[10px] text-slate-400">Read-Only Specification</div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                <AlertTriangle className="w-4 h-4 inline mr-1.5 text-amber-600" />
                Your vendor has not yet submitted an approved design. Please navigate to &quot;Design Review&quot; first.
              </div>
            )}
          </div>

          {/* Student Roster Completeness */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-[#15803D]" />
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Student Demographic Verification
                </h2>
              </div>
              <span className="text-xs font-mono text-slate-400">{totalStudents} Total Records</span>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <div className="text-lg font-bold text-slate-900">{totalStudents}</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Total Cards</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                <div className="text-lg font-bold text-emerald-700">{approvedStudents}</div>
                <div className="text-[10px] text-emerald-600 font-semibold uppercase">Org Approved</div>
              </div>
              <div className={`p-3 rounded-xl border text-center ${
                missingPhotos > 0 
                  ? "bg-amber-50 border-amber-200 text-amber-900" 
                  : "bg-slate-50 border-slate-100 text-slate-900"
              }`}>
                <div className={`text-lg font-bold ${missingPhotos > 0 ? "text-amber-700" : "text-slate-900"}`}>
                  {missingPhotos}
                </div>
                <div className={`text-[10px] font-semibold uppercase ${missingPhotos > 0 ? "text-amber-600" : "text-slate-400"}`}>
                  Missing Photos
                </div>
              </div>
            </div>

            {/* Class Breakdown List */}
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                <span>Class / Cohort</span>
                <span>Quantity</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {Object.entries(classBreakdown).map(([cls, count]) => (
                  <div key={cls} className="px-4 py-2.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{cls}</span>
                    <span className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                      {count} cards
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Freeze Confirmation & Hand-off */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#15803D]" />
              <h2 className="text-sm font-bold text-slate-900">Approve &amp; Freeze</h2>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 text-xs space-y-2">
              <p className="font-semibold text-slate-800">What happens when you approve?</p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-500">
                <li>Exact student records and photos are captured in an immutable snapshot.</li>
                <li>Live database edits will NOT affect this approved batch.</li>
                <li>Your vendor receives the verified batch for PVC print configuration.</li>
                <li>Physical manufacturing request is forwarded to Super Admin by the vendor.</li>
              </ul>
            </div>

            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-[#15803D] focus:ring-[#15803D] w-4 h-4 cursor-pointer"
                />
                <span className="text-xs text-slate-700 leading-tight">
                  I confirm that all {totalStudents} student details and photos are verified, accurate, and ready for physical printing.
                </span>
              </label>
            </div>

            <button
              onClick={handleApproveBatch}
              disabled={approving || !confirmed || !approvedProject || totalStudents === 0}
              className="w-full py-2.5 px-4 bg-[#15803D] hover:bg-[#14532D] text-white text-xs font-bold rounded-xl shadow-sm shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              {approving ? "Freezing Batch..." : "Approve Final Batch"}
            </button>
          </div>

          {/* Workflow Guide */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Info className="w-3.5 h-3.5 text-[#15803D]" />
              Role Distinction Notice
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              As an Organization, your responsibility is to ensure data correctness and design approval. You do not place physical print orders directly. Your vendor handles logistics, material selection, and factory order submission with Super Admin.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
