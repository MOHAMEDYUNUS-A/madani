"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Card3DViewer from "@/components/id-card/Card3DViewer";
import { 
  Sparkles, 
  Layers, 
  Palette, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  ShieldCheck, 
  Check, 
  RotateCcw, 
  FileCheck2, 
  Printer,
  ChevronRight,
  MessageSquare,
  X,
  Building2,
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

interface DesignVariation {
  id: string;
  name: string;
  style_category: string;
  quality_score: number;
  front_canvas_json: any;
  back_canvas_json: any;
  card_width: number;
  card_height: number;
  orientation: string;
}

interface DesignProject {
  id: string;
  name: string;
  status: string;
  brief?: string;
  vendor_id?: string;
  organization_id?: string;
  created_at: string;
  variations: DesignVariation[];
}

export default function DesignReviewPage() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<DesignProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<DesignProject | null>(null);
  
  // Modals
  const [approvingVariation, setApprovingVariation] = useState<DesignVariation | null>(null);
  const [revisingVariation, setRevisingVariation] = useState<DesignVariation | null>(null);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await api.getDesignProjects();
      setProjects(data);
      if (data.length > 0) {
        setSelectedProject(data[0]);
      }
    } catch (err: any) {
      console.error("Failed to load design proposals:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDesign = async () => {
    if (!selectedProject || !approvingVariation) return;
    try {
      setActionLoading(true);
      await api.reviewDesignProposal(selectedProject.id, {
        status: "APPROVED",
        comments: `Approved design variation: ${approvingVariation.name} by School Administrator.`
      });
      toast({
        title: "Design Concept Approved!",
        description: `Template version frozen and activated for ${selectedProject.name}.`,
        variant: "success"
      });
      setApprovingVariation(null);
      await loadProjects();
    } catch (err: any) {
      toast({
        title: "Approval Failed",
        description: err.message || "Could not complete approval.",
        variant: "error"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestRevisions = async () => {
    if (!selectedProject || !revisingVariation) return;
    try {
      setActionLoading(true);
      await api.reviewDesignProposal(selectedProject.id, {
        status: "REVISION_REQUESTED",
        comments: revisionNotes || "Revision requested on card layout and typography."
      });
      toast({
        title: "Revisions Requested",
        description: "Your itemized feedback has been routed to your print vendor.",
        variant: "warning"
      });
      setRevisingVariation(null);
      setRevisionNotes("");
      await loadProjects();
    } catch (err: any) {
      toast({
        title: "Submission Failed",
        description: err.message || "Could not submit revision comments.",
        variant: "error"
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Sample student for design preview
  const sampleStudent = {
    first_name: "Sneha",
    last_name: "Patel",
    identifier: "2026-STU-019",
    class_grade: "Grade 5 - Section B",
    blood_group: "B+",
    dob: "14-Jul-2015",
    emergency_contact: "+91 91234 56789"
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-8 h-8 border-2 border-[#15803D] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-semibold tracking-wide uppercase">
          Loading Vendor Design Proposals...
        </p>
      </div>
    );
  }

  const variations = selectedProject?.variations || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-[#15803D] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              Stage 1: Design Selection
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Palette className="w-6 h-6 text-[#15803D]" /> Vendor Design Concepts Review
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            Compare vendor-created ID card design concepts side by side. Inspect realistic 3D front &amp; back surfaces, approve your school's official template, or request revisions.
          </p>
        </div>

        {selectedProject && (
          <div className="flex items-center gap-3">
            <Badge 
              variant={selectedProject.status === "Approved" ? "success" : "purple"}
              className="text-xs font-bold uppercase tracking-wider px-3 py-1"
            >
              Project: {selectedProject.status}
            </Badge>
          </div>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="p-16 text-center bg-white border border-slate-200 rounded-2xl shadow-xs">
          <Palette className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Design Concepts Submitted Yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Your print partner vendor is currently creating custom ID card design concepts for your institution. Check back shortly or contact your vendor.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Project Selector Tab if multiple projects */}
          {projects.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProject(p)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    selectedProject?.id === p.id
                      ? "bg-[#15803D] text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {p.name} ({p.variations?.length || 0} Concepts)
                </button>
              ))}
            </div>
          )}

          {/* Project Context Summary */}
          {selectedProject && (
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase text-[#15803D] tracking-wider">
                  Active Design Suite
                </span>
                <h3 className="text-sm font-black text-slate-900 mt-0.5">{selectedProject.name}</h3>
                {selectedProject.brief && (
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{selectedProject.brief}</p>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500 font-medium shrink-0">
                <span>Concepts Available: <strong className="text-slate-900 font-bold">{variations.length}</strong></span>
                <span>•</span>
                <span>Submitted: <strong className="text-slate-900 font-bold">{new Date(selectedProject.created_at).toLocaleDateString()}</strong></span>
              </div>
            </div>
          )}

          {/* Side-by-Side Concept Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {variations.map((v, idx) => {
              const primaryCol = v.front_canvas_json?.primaryColor || (idx === 0 ? "#1e3a8a" : idx === 1 ? "#065f46" : "#7c3aed");
              const secondaryCol = v.front_canvas_json?.secondaryColor || (idx === 0 ? "#3b82f6" : idx === 1 ? "#10b981" : "#a855f7");
              const isApproved = selectedProject?.status === "Approved";

              return (
                <div 
                  key={v.id || idx}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-5"
                >
                  {/* Concept Header */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="purple" className="bg-emerald-50 text-[#15803D] border-emerald-200 text-[10px] font-bold">
                        {v.style_category || `Concept ${String.fromCharCode(65 + idx)}`}
                      </Badge>
                      <span className="text-[10px] font-mono font-bold text-slate-500">
                        Match Score: {v.quality_score || 95}%
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-slate-900">{v.name || `Concept ${String.fromCharCode(65 + idx)}`}</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      CR80 {v.orientation || "Portrait"} • Front &amp; Back PVC
                    </p>
                  </div>

                  {/* 3D Realistic Interactive Card */}
                  <div className="py-2 flex items-center justify-center bg-slate-50/70 rounded-xl border border-slate-100">
                    <Card3DViewer
                      student={sampleStudent}
                      template={{
                        primary_color: primaryCol,
                        secondary_color: secondaryCol,
                        org_name: "St. Xavier's International",
                        academic_year: "2026 - 2027",
                        orientation: v.orientation?.toLowerCase() === "landscape" ? "landscape" : "portrait"
                      }}
                      size="sm"
                      showControls={true}
                      interactiveTilt={true}
                    />
                  </div>

                  {/* Feature Highlights */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-600 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">Primary Tone:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full border border-slate-200" style={{ backgroundColor: primaryCol }} />
                        <span className="font-mono text-slate-800 text-[10px] uppercase">{primaryCol}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">Typography:</span>
                      <span className="text-slate-800 font-medium">Inter &amp; Segoe UI</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">Anti-Counterfeit:</span>
                      <span className="text-emerald-700 font-bold">Encrypted QR &amp; Seal</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex flex-col gap-2">
                    <Button
                      onClick={() => setApprovingVariation(v)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1.5" /> Select &amp; Approve Design
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setRevisingVariation(v)}
                      className="w-full text-slate-700 border-slate-300 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-amber-600" /> Request Revisions
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {approvingVariation && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in-50 zoom-in-95">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Confirm Official Design Selection</h3>
                  <p className="text-[10px] text-slate-500">Stage 1 Template Freeze</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setApprovingVariation(null)}
                className="h-8 w-8 text-slate-400"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-2 text-emerald-900">
              <p className="font-bold">
                You are approving: <span className="underline">{approvingVariation.name}</span>
              </p>
              <p className="text-[11px] text-emerald-800">
                Approving this design will lock it as your school&apos;s active official ID card template. All future student records entered by staff will automatically render onto this layout.
              </p>
            </div>

            <div className="text-[11px] text-slate-500 space-y-1">
              <div className="flex justify-between">
                <span>Institution:</span>
                <span className="font-bold text-slate-800">{selectedProject.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Layout Orientation:</span>
                <span className="font-bold text-slate-800">{approvingVariation.orientation || "Portrait"}</span>
              </div>
              <div className="flex justify-between">
                <span>Security Stamp:</span>
                <span className="font-bold text-emerald-700">Digital Signature Ready</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                disabled={actionLoading}
                onClick={handleApproveDesign}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-md"
              >
                {actionLoading ? "Activating Template..." : "Confirm & Activate Template"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setApprovingVariation(null)}
                className="text-xs text-slate-700 border-slate-300"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Revision Request Modal */}
      {revisingVariation && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in-50 zoom-in-95">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Request Design Modifications</h3>
                  <p className="text-[10px] text-slate-500">{revisingVariation.name}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setRevisingVariation(null)}
                className="h-8 w-8 text-slate-400"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Itemized Feedback for Print Vendor
              </label>
              <Textarea
                rows={4}
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                placeholder="e.g. Please make the school logo 15% larger, darken the blue header tone, and include the principal's signature line on the reverse."
                className="w-full text-xs p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
              />
              <p className="text-[10px] text-slate-400">
                Your vendor will receive this feedback and update the design suite with revised concepts.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                disabled={actionLoading || !revisionNotes.trim()}
                onClick={handleRequestRevisions}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer shadow-md"
              >
                {actionLoading ? "Submitting Feedback..." : "Send Feedback to Vendor"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setRevisingVariation(null)}
                className="text-xs text-slate-700 border-slate-300"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
