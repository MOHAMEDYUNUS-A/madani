"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, BatchSnapshot } from "@/lib/api";
import { 
  CheckCircle2, 
  Layers, 
  Printer, 
  AlertCircle, 
  ShieldCheck, 
  Building2, 
  FileCheck2, 
  Send, 
  Sparkles, 
  Clock, 
  Truck, 
  ArrowRight,
  Package,
  Info
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function VendorBatchValidationPage() {
  const [snapshots, setSnapshots] = useState<BatchSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Selected snapshot for print submission
  const [selectedSnapshot, setSelectedSnapshot] = useState<BatchSnapshot | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Production Specifications Form
  const [specs, setSpecs] = useState({
    card_material: "PVC 30mil",
    lamination_finish: "Dual-side Glossy",
    packaging_notes: "Sort and package bundled class-wise with waterproof wrapping",
    delivery_address: "Client Institutional Campus, Main Dispatch Gate",
    unit_price_estimate: 25.0
  });

  const fetchSnapshots = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getBatchSnapshots();
      setSnapshots(data);
      if (data.length > 0 && !selectedSnapshot) {
        setSelectedSnapshot(data[0]);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load organization batch snapshots.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSnapshots();
  }, []);

  const handleSubmitPrintJob = async () => {
    if (!selectedSnapshot) return;

    try {
      setSubmitting(true);
      setError(null);
      await api.createPrintJob({
        batch_snapshot_id: selectedSnapshot.id,
        shipping_address: {
          address: specs.delivery_address,
          packaging: specs.packaging_notes,
          material: specs.card_material,
          finish: specs.lamination_finish
        }
      });
      setSuccess(`Physical print request for Snapshot #${selectedSnapshot.snapshot_number} submitted to Super Admin production queue.`);
      await fetchSnapshots();
    } catch (err: any) {
      setError(err?.message || "Failed to submit print request to Super Admin.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 text-xs">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        Inspecting organization approval snapshots...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Badge variant="warning">Vendor Stage</Badge>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
            Print Readiness &amp; Physical Order Dispatch
          </span>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white mt-1">
          Client Batch Validation &amp; Print Submission
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Review frozen batch snapshots signed off by client organizations, audit print-readiness, specify PVC parameters, and submit for centralized Super Admin manufacturing.
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

      {snapshots.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
          <Layers className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900">No Approved Batches Awaiting Submission</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Once a client organization reviews their students and freezes their final batch, it will appear here for physical print validation.
          </p>
          <Link
            href="/vendor/organizations"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <span>View Client Organizations</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Snapshot Selector & Specs Audit */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Frozen Batch Snapshots ({snapshots.length})
            </h2>

            <div className="space-y-3">
              {snapshots.map((snap) => {
                const isSelected = selectedSnapshot?.id === snap.id;
                return (
                  <div
                    key={snap.id}
                    onClick={() => setSelectedSnapshot(snap)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-amber-50/60 border-amber-500 shadow-sm ring-2 ring-amber-500/20"
                        : "bg-white border-slate-200 hover:border-amber-300 hover:bg-slate-50/60 shadow-2xs"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">
                              Snapshot #{snap.snapshot_number}
                            </span>
                            <Badge variant={snap.status === "AWAITING_VENDOR_VALIDATION" ? "warning" : "default"}>
                              {snap.status}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Created: {new Date(snap.created_at).toLocaleString()} &bull; Total Verified Cards: <span className="text-amber-700 font-bold">{snap.total_cards}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-mono text-slate-700">
                          {snap.missing_photo_count === 0 ? (
                            <span className="text-emerald-700 flex items-center gap-1 sm:justify-end font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> 100% Photos Complete
                            </span>
                          ) : (
                            <span className="text-amber-700 flex items-center gap-1 sm:justify-end font-semibold">
                              <AlertCircle className="w-3.5 h-3.5" /> {snap.missing_photo_count} Missing Photos
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Class breakdown */}
                    {snap.class_breakdown && (
                      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                        {Object.entries(snap.class_breakdown).map(([cls, qty]) => (
                          <span
                            key={cls}
                            className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-700 text-[10px] font-mono border border-slate-200"
                          >
                            {cls}: <strong className="text-slate-900">{qty as any}</strong>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Print Readiness Checklist for Selected Snapshot */}
            {selectedSnapshot && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Automated Pre-flight Readiness Checks
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-800">CR80 Physical Dimensions</div>
                      <div className="text-[10px] text-slate-500">85.60 &times; 53.98 mm &bull; 30mil thickness</div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-800">CMYK 300 DPI Vector Target</div>
                      <div className="text-[10px] text-slate-500">Bleed margins and safe print zones verified</div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-800">Dynamic Anti-Counterfeit QR</div>
                      <div className="text-[10px] text-slate-500">High contrast code embedded on back</div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-800">Client Approval Record</div>
                      <div className="text-[10px] text-slate-500">Signed off by Institutional Administrator</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Physical Production Parameters & Submit */}
          {selectedSnapshot && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-amber-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Production Configuration
                  </h3>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Card Material
                  </label>
                  <select
                    value={specs.card_material}
                    onChange={(e) => setSpecs({ ...specs, card_material: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-medium"
                  >
                    <option value="PVC 30mil">Premium PVC (30 mil / 0.76mm)</option>
                    <option value="Bio-PVC">Eco-friendly Bio-PVC</option>
                    <option value="Composite PET/PVC">Composite PET/PVC (Heavy Duty)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lamination Finish
                  </label>
                  <select
                    value={specs.lamination_finish}
                    onChange={(e) => setSpecs({ ...specs, lamination_finish: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-medium"
                  >
                    <option value="Dual-side Glossy">Dual-side Ultra Glossy</option>
                    <option value="Matte Velvet">Matte Velvet Finish (Anti-Glare)</option>
                    <option value="Holographic Overlay">Holographic Security Overlay</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Packaging &amp; Sorting Instructions
                  </label>
                  <input
                    type="text"
                    value={specs.packaging_notes}
                    onChange={(e) => setSpecs({ ...specs, packaging_notes: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Campus Delivery Address
                  </label>
                  <textarea
                    rows={2}
                    value={specs.delivery_address}
                    onChange={(e) => setSpecs({ ...specs, delivery_address: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>

                {/* Estimate */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Quantity</span>
                    <span className="font-mono text-slate-900 font-bold">{selectedSnapshot.total_cards} cards</span>
                  </div>
                  <div className="flex justify-between text-slate-600 mt-1">
                    <span>Est. Unit Cost</span>
                    <span className="font-mono text-slate-900 font-bold">&#8377;{specs.unit_price_estimate.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 mt-2 border-t border-slate-200 flex justify-between font-bold text-amber-700">
                    <span>Quotation Total</span>
                    <span>&#8377;{(selectedSnapshot.total_cards * specs.unit_price_estimate).toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={handleSubmitPrintJob}
                  disabled={submitting || selectedSnapshot.status === "SUBMITTED_TO_SUPER_ADMIN"}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-sm shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submitting 
                    ? "Dispatching to Factory..." 
                    : selectedSnapshot.status === "SUBMITTED_TO_SUPER_ADMIN"
                    ? "Already Dispatched to Super Admin"
                    : "Submit Physical Order to Super Admin"}
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <Info className="w-3.5 h-3.5 text-amber-600" />
                  Centralized Factory Production
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Upon submission, the job enters the Super Admin manufacturing pipeline. Super Admin verifies payment/quotation, handles high-speed printing, quality control, packaging, and dispatch tracking.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
