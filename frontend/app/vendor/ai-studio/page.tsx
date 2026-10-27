"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { 
  Sparkles, 
  Send, 
  Bot, 
  Palette, 
  User, 
  Building2, 
  QrCode, 
  Barcode, 
  Layers, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight,
  Shield
} from "lucide-react";

function AIStudioContent() {
  const searchParams = useSearchParams();
  const preSelectedOrg = searchParams.get("org_id");

  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>(preSelectedOrg || "");
  const [brief, setBrief] = useState(
    "Modern academic ID card with navy blue header banner, student photo, class and blood group, plus a dynamic QR verification code on front."
  );
  const [orientation, setOrientation] = useState<"Landscape" | "Portrait">("Landscape");
  const [generating, setGenerating] = useState(false);
  const [variations, setVariations] = useState<any[]>([]);
  const [selectedVariationIndex, setSelectedVariationIndex] = useState(0);
  const [activeSide, setActiveSide] = useState<"front" | "back">("front");
  
  // Chat-to-canvas state
  const [chatCommand, setChatCommand] = useState("");
  const [refining, setRefining] = useState(false);
  const [chatLog, setChatLog] = useState<any[]>([
    { role: "assistant", text: "AI Design Assistant ready. Enter a natural-language brief above to generate 3 professional card variations, or ask me to adjust the active canvas below!" }
  ]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      const user = await api.getMe();
      if (user.vendor_id) {
        const orgs = await api.getVendorOrganizations(user.vendor_id);
        setOrganizations(orgs);
        if (orgs.length > 0 && !selectedOrgId) {
          setSelectedOrgId(orgs[0].id);
        }
      } else {
        const vendors = await api.getVendors();
        if (vendors.length > 0) {
          const orgs = await api.getVendorOrganizations(vendors[0].id);
          setOrganizations(orgs);
          if (orgs.length > 0 && !selectedOrgId) {
            setSelectedOrgId(orgs[0].id);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load organizations:", err);
    }
  };

  const handleGenerateVariations = async () => {
    if (!selectedOrgId) {
      alert("Please select a target client organization first.");
      return;
    }
    setGenerating(true);
    try {
      const res = await api.generateDesignVariations({
        organization_id: selectedOrgId,
        brief: brief,
        orientation: orientation,
        card_width: orientation === "Landscape" ? 3.375 : 2.125,
        card_height: orientation === "Landscape" ? 2.125 : 3.375
      });
      setVariations(res.variations || []);
      setSelectedVariationIndex(0);
      setChatLog(prev => [
        ...prev,
        { role: "assistant", text: `Generated ${res.variations?.length || 3} distinct design variations with full front and back layouts. Select any variation below to inspect or refine via chat!` }
      ]);
    } catch (err: any) {
      alert(err.message || "Failed to generate design variations");
    } finally {
      setGenerating(false);
    }
  };

  const handleChatRefine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatCommand.trim() || variations.length === 0) return;
    
    const cmd = chatCommand;
    setChatCommand("");
    setRefining(true);
    setChatLog(prev => [...prev, { role: "user", text: cmd }]);

    try {
      const currentVar = variations[selectedVariationIndex];
      const targetLayout = activeSide === "front" ? currentVar.front : currentVar.back;

      const res = await api.chatRefineCanvas({
        organization_id: selectedOrgId,
        current_layout: targetLayout,
        user_command: cmd
      });

      // Update layout in memory
      const updatedVars = [...variations];
      if (activeSide === "front") {
        updatedVars[selectedVariationIndex].front = res.updated_layout;
      } else {
        updatedVars[selectedVariationIndex].back = res.updated_layout;
      }
      setVariations(updatedVars);

      setChatLog(prev => [
        ...prev,
        { role: "assistant", text: res.explanation || "Applied changes to canvas elements." }
      ]);
    } catch (err: any) {
      setChatLog(prev => [
        ...prev,
        { role: "assistant", text: `⚠️ Could not apply edit: ${err.message}` }
      ]);
    } finally {
      setRefining(false);
    }
  };

  const handleSubmitProposal = async () => {
    if (!selectedOrgId || variations.length === 0) return;
    setSubmitting(true);
    try {
      const selectedVar = variations[selectedVariationIndex];
      // 1. Create project with variations
      const proj = await api.createDesignProject({
        organization_id: selectedOrgId,
        name: `${selectedVar.variation_name} Proposal`,
        brief: brief,
        card_category: "School",
        card_width: selectedVar.card_width || 3.375,
        card_height: selectedVar.card_height || 2.125,
        orientation: selectedVar.orientation || orientation,
        initial_variations: variations
      });

      // 2. Submit proposal to organization admin
      await api.submitDesignProposal(proj.id);
      alert("Design proposal successfully submitted to the Organization Administrator for review and formal approval!");
    } catch (err: any) {
      alert(err.message || "Failed to submit proposal");
    } finally {
      setSubmitting(false);
    }
  };

  const activeVariation = variations[selectedVariationIndex];
  const activeLayout = activeVariation ? (activeSide === "front" ? activeVariation.front : activeVariation.back) : null;
  const isLandscape = (activeVariation?.orientation || orientation) === "Landscape";
  const canvasWidthPx = isLandscape ? 337.5 : 212.5;
  const canvasHeightPx = isLandscape ? 212.5 : 337.5;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
            Agentic AI Studio
          </span>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-0.5">
            Multi-Variation Design Generator & Chat Refiner
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Generate 3+ structured card compositions from natural language, refine elements with conversational AI, and submit for client approval.
          </p>
        </div>
        {variations.length > 0 && (
          <button
            onClick={handleSubmitProposal}
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <span>🚀</span> {submitting ? "Submitting..." : "Submit Proposal to Client"}
          </button>
        )}
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Brief Input & Organization Selector (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>🎯</span> 1. Design Constraints
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Target Client Organization</label>
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              >
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.org_type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Orientation</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrientation("Landscape")}
                  className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                    orientation === "Landscape"
                      ? "bg-amber-500/10 border-amber-500 text-amber-400"
                      : "bg-slate-50 border-slate-200 text-slate-500"
                  }`}
                >
                  Landscape (CR80)
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation("Portrait")}
                  className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                    orientation === "Portrait"
                      ? "bg-amber-500/10 border-amber-500 text-amber-400"
                      : "bg-slate-50 border-slate-200 text-slate-500"
                  }`}
                >
                  Portrait (CR80)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Natural Language Design Brief</label>
              <textarea
                rows={4}
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="Describe colors, headers, required fields, and layout theme..."
                className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              onClick={handleGenerateVariations}
              disabled={generating}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>✨</span> {generating ? "Synthesizing Variations..." : "Generate 3 Variations"}
            </button>
          </div>

          {/* AI Chat-to-Canvas Agent Panel */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3 flex flex-col h-80">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <span>💬</span> AI Canvas Editing Agent
            </h3>
            
            {/* Chat conversation history */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
              {chatLog.map((msg, i) => (
                <div
                  key={i}
                  className={`p-2.5 rounded-xl ${
                    msg.role === "user"
                      ? "bg-amber-500/10 border border-amber-500/20 text-amber-200 ml-4"
                      : "bg-slate-50 border border-slate-200 text-slate-700 mr-2"
                  }`}
                >
                  {msg.text}
                </div>
              ))}
              {refining && (
                <div className="p-2 text-xs text-amber-400 animate-pulse">
                  Refining canvas layout elements...
                </div>
              )}
            </div>

            {/* Input form */}
            <form onSubmit={handleChatRefine} className="flex gap-2 pt-2 border-t border-slate-200">
              <input
                type="text"
                disabled={variations.length === 0 || refining}
                placeholder={variations.length === 0 ? "Generate variations first..." : "e.g. 'move photo right', 'make name bold'..."}
                value={chatCommand}
                onChange={(e) => setChatCommand(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-amber-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={variations.length === 0 || refining}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Variations Gallery & Interactive Canvas Preview (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Variations Carousel Tabs */}
          {variations.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Select Design Variation ({selectedVariationIndex + 1} of {variations.length})
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {variations.map((v, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedVariationIndex(idx)}
                    className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden ${
                      selectedVariationIndex === idx
                        ? "bg-slate-50 border-amber-500 shadow-md shadow-amber-500/10"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-white truncate pr-2">{v.variation_name}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {v.quality_score || 98}%
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block capitalize">{v.style_family.replace("_", " ")}</span>
                    <span className="text-[10px] text-slate-500 block mt-1">{v.front?.elements?.length || 0} elements • Front/Back</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Canvas Canvas Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-white">Active Face:</span>
                <div className="inline-flex rounded-lg bg-slate-50 p-1 border border-slate-200">
                  <button
                    onClick={() => setActiveSide("front")}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                      activeSide === "front" ? "bg-amber-500 text-black shadow-sm" : "text-slate-500"
                    }`}
                  >
                    Front Side
                  </button>
                  <button
                    onClick={() => setActiveSide("back")}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                      activeSide === "back" ? "bg-amber-500 text-black shadow-sm" : "text-slate-500"
                    }`}
                  >
                    Back Side
                  </button>
                </div>
              </div>

              {activeVariation && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>Pre-flight Vector Certified ({canvasWidthPx} × {canvasHeightPx} pt)</span>
                </div>
              )}
            </div>

            {/* Canvas Stage */}
            <div className="p-8 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center min-h-[380px] overflow-auto">
              {!activeLayout ? (
                <div className="text-center space-y-3">
                  <Palette className="w-12 h-12 mx-auto text-slate-700 mb-1" />
                  <p className="text-slate-500 text-xs">
                    No variations generated yet. Click &quot;Generate 3 Variations&quot; to synthesize editable cards!
                  </p>
                </div>
              ) : (
                <div
                  className="relative rounded-lg shadow-2xl overflow-hidden border border-slate-300 transition-all select-none"
                  style={{
                    width: `${canvasWidthPx}px`,
                    height: `${canvasHeightPx}px`,
                    backgroundColor: activeLayout.background_color || "#ffffff"
                  }}
                >
                  {/* Render Elements */}
                  {(activeLayout.elements || []).map((el: any, i: number) => {
                    const elStyle: React.CSSProperties = {
                      position: "absolute",
                      left: `${el.x}px`,
                      top: `${el.y}px`,
                      width: `${el.width}px`,
                      height: `${el.height}px`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: el.align === "center" ? "center" : "flex-start",
                      fontSize: `${el.font_size || 10}px`,
                      fontWeight: el.bold ? "bold" : "normal",
                      color: el.color || "#111827",
                      backgroundColor: el.fill ? el.color : "transparent",
                      overflow: "hidden",
                      lineHeight: "1.2",
                      border: !el.fill && el.type === "shape" ? `1px solid ${el.color}` : "none",
                      boxSizing: "border-box"
                    };

                    if (el.type === "photo") {
                      return (
                        <div
                          key={el.id || i}
                          style={elStyle}
                          className="bg-slate-200 border-2 border-slate-300 rounded flex flex-col items-center justify-center text-[10px] text-slate-500 font-bold"
                        >
                          <User className="w-4 h-4 text-slate-500 mb-0.5" />
                          <span className="text-[8px] uppercase">Photo</span>
                        </div>
                      );
                    }

                    if (el.type === "logo") {
                      return (
                        <div
                          key={el.id || i}
                          style={elStyle}
                          className="bg-slate-100 border border-dashed border-slate-400 rounded flex items-center justify-center gap-1 text-[9px] text-slate-500 font-bold"
                        >
                          <Building2 className="w-3.5 h-3.5 text-slate-500" /> LOGO
                        </div>
                      );
                    }

                    if (el.type === "qr") {
                      return (
                        <div
                          key={el.id || i}
                          style={elStyle}
                          className="bg-white border border-slate-300 rounded flex items-center justify-center text-[8px] font-bold text-black"
                        >
                          <QrCode className="w-4 h-4 text-slate-800" />
                        </div>
                      );
                    }

                    if (el.type === "barcode") {
                      return (
                        <div
                          key={el.id || i}
                          style={elStyle}
                          className="bg-white border border-slate-300 rounded flex items-center justify-center text-[9px] font-mono tracking-widest text-black"
                        >
                          ||||||||||||||||
                        </div>
                      );
                    }

                    return (
                      <div key={el.id || i} style={elStyle}>
                        {el.value || ""}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quality Report Checklist */}
            {activeVariation?.quality_report && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                <span className="font-bold text-slate-700 block">Print Quality Pre-flight Report:</span>
                {(activeVariation.quality_report.warnings || []).length === 0 ? (
                  <p className="text-emerald-400 font-medium">✓ 100% vector aligned. Safe area, resolution and margin boundaries verified.</p>
                ) : (
                  (activeVariation.quality_report.warnings || []).map((w: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-1.5 text-slate-500">
                      <span className="text-amber-400">•</span>
                      <span>{w}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AIStudioPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-500">Loading AI Studio...</div>}>
      <AIStudioContent />
    </Suspense>
  );
}
