"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  Factory, 
  RefreshCw, 
  SlidersHorizontal, 
  ShieldAlert, 
  CheckCircle2, 
  Printer, 
  Box, 
  Truck, 
  FileCheck2, 
  X, 
  AlertTriangle, 
  Check,
  PackageCheck,
  ShieldCheck,
  CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface PrintJobItem {
  id: string;
  job_id: string;
  organization_name: string;
  quantity: number;
  status: string;
  total_amount: number;
  payment_status: string;
  created_at: string;
}

const NEXT_STATUS_MAP: Record<string, string[]> = {
  "Awaiting Review": ["Quotation Pending", "Approved for Production", "Cancelled"],
  "Quotation Pending": ["Approved for Production", "Cancelled"],
  "Approved for Production": ["Printing", "Cancelled"],
  "Printing": ["Quality Check", "Cancelled"],
  "Quality Check": ["Packed", "Printing", "Cancelled"],
  "Packed": ["Dispatched", "Cancelled"],
  "Dispatched": ["Delivered", "Cancelled"],
  "Delivered": ["Completed"],
  "Completed": [],
  "Cancelled": []
};

export default function AdminProductionPage() {
  const [jobs, setJobs] = useState<PrintJobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<PrintJobItem | null>(null);

  // Transition form
  const [targetStatus, setTargetStatus] = useState("");
  const [transitionReason, setTransitionReason] = useState("");
  const [productionNotes, setProductionNotes] = useState("");
  const [quotationAmount, setQuotationAmount] = useState<number | undefined>();
  const [submitting, setSubmitting] = useState(false);

  // QC modal form
  const [showQCModal, setShowQCModal] = useState(false);
  const [qcInspector, setQcInspector] = useState("");
  const [qcStatus, setQcStatus] = useState<"Passed" | "Failed" | "Warning">("Passed");
  const [qcColorAcc, setQcColorAcc] = useState(true);
  const [qcAlignment, setQcAlignment] = useState(true);
  const [qcLamination, setQcLamination] = useState(true);
  const [qcBarcode, setQcBarcode] = useState(true);
  const [qcDefects, setQcDefects] = useState(0);
  const [qcNotes, setQcNotes] = useState("");

  // Dispatch modal form
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [courierName, setCourierName] = useState("BlueDart Express");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [expectedDelivery, setExpectedDelivery] = useState("");

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const data = await api.getPrintJobs();
      setJobs(data);
      if (data.length > 0 && !selectedJob) {
        setSelectedJob(data[0]);
      }
    } catch (err: any) {
      console.error("Failed to load production print jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectJob = (job: PrintJobItem) => {
    setSelectedJob(job);
    const allowed = NEXT_STATUS_MAP[job.status] || [];
    setTargetStatus(allowed[0] || "");
    setQuotationAmount(job.total_amount);
    setTransitionReason("");
    setProductionNotes("");
    setFeedback(null);
  };

  const handleStatusTransition = async () => {
    if (!selectedJob || !targetStatus) return;
    try {
      setSubmitting(true);
      setFeedback(null);
      await api.updatePrintJobStatus(selectedJob.id, {
        status: targetStatus,
        reason: transitionReason || `Status advanced to ${targetStatus} by Super Admin`,
        production_notes: productionNotes || undefined,
        quotation_amount: quotationAmount || undefined
      });
      setFeedback({
        type: "success",
        message: `Job ${selectedJob.job_id} transitioned successfully to '${targetStatus}'.`
      });
      await loadJobs();
      setSelectedJob(prev => prev ? { ...prev, status: targetStatus, total_amount: quotationAmount || prev.total_amount } : null);
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to update print job status."
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogQC = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;
    try {
      setSubmitting(true);
      setFeedback(null);
      await api.addQCCheck(selectedJob.id, {
        inspector_name: qcInspector || "Super Admin / Lead QC",
        overall_status: qcStatus,
        color_accuracy: qcColorAcc,
        alignment_check: qcAlignment,
        lamination_quality: qcLamination,
        barcode_scannability: qcBarcode,
        defect_count: Number(qcDefects),
        notes: qcNotes
      });
      setShowQCModal(false);
      setFeedback({
        type: "success",
        message: `Quality Control record for ${selectedJob.job_id} logged successfully with status '${qcStatus}'.`
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to record QC check."
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;
    try {
      setSubmitting(true);
      setFeedback(null);
      await api.recordDispatch(selectedJob.id, {
        courier_name: courierName,
        tracking_number: trackingNumber,
        tracking_url: trackingUrl || undefined,
        expected_delivery_date: expectedDelivery ? new Date(expectedDelivery).toISOString() : undefined
      });
      setShowDispatchModal(false);
      setFeedback({
        type: "success",
        message: `Dispatch details for ${selectedJob.job_id} recorded via ${courierName} (${trackingNumber}).`
      });
      await loadJobs();
      setSelectedJob(prev => prev ? { ...prev, status: "Dispatched" } : null);
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to record dispatch details."
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-100 text-purple-700 border border-purple-200 rounded-xl">
              <Factory className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Centralized Print Production Hub</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Super Admin fulfillment lifecycle, quotation adjustments, QC audit logging, and dispatch coordination.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={loadJobs}
            className="text-xs font-bold text-slate-700 border-slate-300 hover:bg-slate-100 cursor-pointer shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh Queue
          </Button>
          <Badge variant="purple" className="bg-purple-100 text-purple-800 border-purple-200 font-mono text-xs">
            {jobs.length} Active Jobs
          </Badge>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl border text-xs font-bold flex items-center gap-2 ${
          feedback.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
            : "bg-rose-50 text-rose-800 border-rose-200"
        }`}>
          {feedback.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-xl bg-slate-200" />
          <Skeleton className="h-96 w-full rounded-2xl bg-slate-200" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Jobs List */}
          <div className="lg:col-span-5 space-y-3">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider px-1">
              Production Orders ({jobs.length})
            </h3>
            <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
              {jobs.map((j) => {
                const isSelected = selectedJob?.id === j.id;
                return (
                  <button
                    key={j.id}
                    onClick={() => handleSelectJob(j)}
                    className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-purple-50/70 border-purple-500 shadow-sm ring-2 ring-purple-500/20"
                        : "bg-white border-slate-200 hover:border-purple-300 hover:bg-slate-50/60 shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-mono font-black text-slate-900">{j.job_id}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        j.status === "Approved for Production" || j.status === "Printing"
                          ? "bg-blue-100 text-blue-800 border border-blue-200"
                          : j.status === "Delivered" || j.status === "Completed"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}>
                        {j.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-800 font-bold truncate">
                      {j.organization_name}
                    </div>

                    <div className="flex items-center justify-between mt-3 text-[11px] text-slate-500">
                      <span>{j.quantity} Cards</span>
                      <span className="font-mono text-purple-700 font-bold">₹{j.total_amount?.toLocaleString()}</span>
                      <span>{new Date(j.created_at).toLocaleDateString()}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Job Control Console */}
          {selectedJob ? (
            <div className="lg:col-span-7 space-y-6">
              {/* Order Overview Panel */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-[10px] font-mono text-purple-700 font-black uppercase tracking-wider">
                      JOB ORDER #{selectedJob.job_id}
                    </span>
                    <h2 className="text-lg font-black text-slate-900 mt-0.5">{selectedJob.organization_name}</h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => setShowQCModal(true)}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Log QC Check
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowDispatchModal(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm cursor-pointer"
                    >
                      <Truck className="w-3.5 h-3.5 mr-1" /> Record Dispatch
                    </Button>
                  </div>
                </div>

                {/* State Machine Transition Engine */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600" /> State Machine Controller
                    </span>
                    <span className="text-xs font-mono font-bold text-purple-700">
                      Current: {selectedJob.status}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Select Permitted Target Transition
                    </label>
                    <select
                      value={targetStatus}
                      onChange={(e) => setTargetStatus(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 font-bold focus:outline-none focus:border-purple-500"
                    >
                      {(NEXT_STATUS_MAP[selectedJob.status] || []).length === 0 && (
                        <option value="">No forward transitions permitted (Terminal State)</option>
                      )}
                      {(NEXT_STATUS_MAP[selectedJob.status] || []).map((s) => (
                        <option key={s} value={s}>
                          Advance state to &rarr; {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Quotation Amount (INR ₹)
                      </label>
                      <input
                        type="number"
                        value={quotationAmount || ""}
                        onChange={(e) => setQuotationAmount(Number(e.target.value))}
                        className="w-full text-xs p-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 font-mono"
                        placeholder="Quoted price"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Operator Audit Note
                      </label>
                      <input
                        type="text"
                        value={transitionReason}
                        onChange={(e) => setTransitionReason(e.target.value)}
                        placeholder="e.g. Approved and routed to press #3"
                        className="w-full text-xs p-2.5 rounded-lg bg-white border border-slate-300 text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Internal Production Notes
                    </label>
                    <textarea
                      rows={2}
                      value={productionNotes}
                      onChange={(e) => setProductionNotes(e.target.value)}
                      placeholder="Special instructions for print operators, packaging, or courier..."
                      className="w-full text-xs p-2.5 rounded-lg bg-white border border-slate-300 text-slate-900"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      disabled={submitting || !targetStatus}
                      onClick={handleStatusTransition}
                      className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer"
                    >
                      {submitting ? "Applying State..." : `Commit Transition: ${targetStatus || "None"}`}
                    </Button>
                  </div>
                </div>

                {/* Job Specifications */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">Card Volume</span>
                    <span className="text-sm font-black text-slate-900">{selectedJob.quantity}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">Payment</span>
                    <span className="text-sm font-black text-amber-700">{selectedJob.payment_status}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">Snapshot Lock</span>
                    <span className="text-sm font-black text-emerald-700">Frozen</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">Billed Total</span>
                    <span className="text-sm font-black text-purple-700">₹{selectedJob.total_amount}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs shadow-2xs">
              Select an active production job from the left queue to view and manage controls.
            </div>
          )}
        </div>
      )}

      {/* QC Modal */}
      {showQCModal && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in-50 zoom-in-95">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-600" /> Log Quality Control Check ({selectedJob.job_id})
              </h3>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowQCModal(false)}
                className="h-8 w-8 text-slate-400 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleLogQC} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Inspector Name / ID</label>
                <input
                  type="text"
                  required
                  value={qcInspector}
                  onChange={(e) => setQcInspector(e.target.value)}
                  placeholder="e.g. Lead QA - John Doe"
                  className="w-full text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Overall QA Decision</label>
                <select
                  value={qcStatus}
                  onChange={(e) => setQcStatus(e.target.value as any)}
                  className="w-full text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-bold"
                >
                  <option value="Passed">Passed (Meets All Tolerances)</option>
                  <option value="Warning">Warning (Minor Deviations)</option>
                  <option value="Failed">Failed (Reject & Reprint)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qcColorAcc}
                    onChange={(e) => setQcColorAcc(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-0"
                  />
                  <span className="text-slate-700 font-semibold">Color Accuracy (&Delta;E &lt; 2)</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qcAlignment}
                    onChange={(e) => setQcAlignment(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-0"
                  />
                  <span className="text-slate-700 font-semibold">Margin & Bleed Alignment</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qcLamination}
                    onChange={(e) => setQcLamination(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-0"
                  />
                  <span className="text-slate-700 font-semibold">Lamination Bond / Finish</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qcBarcode}
                    onChange={(e) => setQcBarcode(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-0"
                  />
                  <span className="text-slate-700 font-semibold">Barcode / QR Verification</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Defect Count</label>
                  <input
                    type="number"
                    value={qcDefects}
                    onChange={(e) => setQcDefects(Number(e.target.value))}
                    min={0}
                    className="w-full text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Inspection Notes</label>
                  <input
                    type="text"
                    value={qcNotes}
                    onChange={(e) => setQcNotes(e.target.value)}
                    placeholder="Tolerance readings, press notes..."
                    className="w-full text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer"
                >
                  {submitting ? "Logging QC Record..." : "Confirm & Save QC Record"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowQCModal(false)}
                  className="text-xs text-slate-700 border-slate-300 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dispatch Modal */}
      {showDispatchModal && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in-50 zoom-in-95">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600" /> Record Courier &amp; Dispatch ({selectedJob.job_id})
              </h3>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowDispatchModal(false)}
                className="h-8 w-8 text-slate-400 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleRecordDispatch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Courier / Logistics Partner</label>
                <select
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-bold"
                >
                  <option value="BlueDart Express">BlueDart Express</option>
                  <option value="DTDC Courier">DTDC Courier</option>
                  <option value="Delhivery Logistics">Delhivery Logistics</option>
                  <option value="FedEx India">FedEx India</option>
                  <option value="India Post EMS">India Post EMS Speed Post</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Airway Bill / Tracking Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. BD7891230491"
                  className="w-full text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tracking URL (Optional)</label>
                <input
                  type="url"
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="https://track.courier.com/BD7891230491"
                  className="w-full text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Estimated Delivery Date</label>
                <input
                  type="date"
                  value={expectedDelivery}
                  onChange={(e) => setExpectedDelivery(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                >
                  {submitting ? "Recording Dispatch..." : "Confirm Dispatch & Notify Parties"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDispatchModal(false)}
                  className="text-xs text-slate-700 border-slate-300 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
