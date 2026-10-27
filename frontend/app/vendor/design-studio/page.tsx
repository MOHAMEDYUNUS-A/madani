"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { 
  Type, 
  User, 
  Shield, 
  QrCode, 
  Square, 
  Minus, 
  Barcode, 
  PenTool, 
  Undo2, 
  Redo2, 
  Save, 
  Plus, 
  ZoomIn, 
  ZoomOut, 
  Eye, 
  Grid, 
  Layers, 
  LayoutTemplate,
  Palette,
  Sparkles,
  Building2,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  Trash2,
  Copy,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Move
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

function VendorDesignerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialOrgId = searchParams.get("org_id");
  const initialTemplateId = searchParams.get("template_id");

  // Organizations & Templates Selection
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>(initialOrgId || "");
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(initialTemplateId || "");
  const [template, setTemplate] = useState<any>(null);

  // Active Canvas State
  const [activeTab, setActiveTab] = useState<"front" | "back">("front");
  const [orientation, setOrientation] = useState<"Landscape" | "Portrait">("Landscape");
  const [frontElements, setFrontElements] = useState<any[]>([]);
  const [backElements, setBackElements] = useState<any[]>([]);
  const [frontBgColor, setFrontBgColor] = useState("#ffffff");
  const [backBgColor, setBackBgColor] = useState("#ffffff");
  const [frontBgImage, setFrontBgImage] = useState("");
  const [backBgImage, setBackBgImage] = useState("");

  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Saved ✓");

  // Canvas View Controls
  const [zoom, setZoom] = useState(1.0);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Undo / Redo Stack
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Sample Student for Live Preview
  const sampleStudent = {
    name: "Zayd Mohamed",
    id: "MAD-2026-1001",
    class: "Grade 10 - Section A",
    blood: "O+",
    phone: "+91 98765 43210",
    dob: "14/05/2008",
    address: "12 Crescent Avenue, Chennai, TN",
    photo: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=400"
  };

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragInfo = useRef({
    isDragging: false,
    mode: "translate" as "translate" | "resize",
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    initialWidth: 0,
    initialHeight: 0
  });

  // Load Vendor Organizations
  useEffect(() => {
    loadVendorOrganizations();
  }, []);

  // When selectedOrgId changes, load templates for that org
  useEffect(() => {
    if (selectedOrgId) {
      loadOrgTemplates(selectedOrgId);
    }
  }, [selectedOrgId]);

  // When selectedTemplateId changes, load its layout
  useEffect(() => {
    if (selectedTemplateId) {
      loadTemplateLayout(selectedTemplateId);
    }
  }, [selectedTemplateId]);

  const loadVendorOrganizations = async () => {
    try {
      const user = await api.getMe();
      let orgs: any[] = [];
      if (user.vendor_id) {
        orgs = await api.getVendorOrganizations(user.vendor_id);
      } else {
        const vendors = await api.getVendors();
        if (vendors.length > 0) {
          orgs = await api.getVendorOrganizations(vendors[0].id);
        }
      }
      setOrganizations(orgs);
      if (orgs.length > 0 && !selectedOrgId) {
        setSelectedOrgId(orgs[0].id);
      }
    } catch (err) {
      console.error("Failed to load organizations:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadOrgTemplates = async (orgId: string) => {
    try {
      const list = await api.getTemplates();
      // Filter templates for this org or global
      const orgTemplates = list.filter((t: any) => !t.organization_id || t.organization_id === orgId);
      setTemplates(orgTemplates);
      if (orgTemplates.length > 0) {
        if (!selectedTemplateId || !orgTemplates.some((t: any) => t.id === selectedTemplateId)) {
          setSelectedTemplateId(orgTemplates[0].id);
        }
      } else {
        // Create a default initial template if none exist
        createNewTemplate("Standard School ID Card");
      }
    } catch (err) {
      console.error("Failed to load templates:", err);
    }
  };

  const loadTemplateLayout = async (templateId: string) => {
    try {
      setLoading(true);
      const res = await api.getTemplateDetails(templateId);
      setTemplate(res);
      setOrientation(res.orientation || "Landscape");

      const versions = res.versions || [];
      const latestVer = versions[versions.length - 1];
      if (latestVer && latestVer.layout_data) {
        const layout = latestVer.layout_data;
        const front = (layout.front?.elements || []).map((el: any, idx: number) => ({
          ...el,
          id: el.id || `el-front-${idx}-${Date.now()}`
        }));
        const back = (layout.back?.elements || []).map((el: any, idx: number) => ({
          ...el,
          id: el.id || `el-back-${idx}-${Date.now()}`
        }));
        const frontColor = layout.front?.background_color || "#ffffff";
        const backColor = layout.back?.background_color || "#ffffff";
        const frontImg = layout.front?.background_image || "";
        const backImg = layout.back?.background_image || "";

        setFrontElements(front);
        setBackElements(back);
        setFrontBgColor(frontColor);
        setBackBgColor(backColor);
        setFrontBgImage(frontImg);
        setBackBgImage(backImg);

        setHistory([{ front, back, frontColor, backColor, frontImg, backImg }]);
        setHistoryIndex(0);
      } else {
        // Setup initial default card elements
        initDefaultElements();
      }
    } catch (err) {
      console.error("Failed to load template layout:", err);
      initDefaultElements();
    } finally {
      setLoading(false);
    }
  };

  const initDefaultElements = () => {
    const defaultFront = [
      {
        id: `el-hdr-${Date.now()}`,
        type: "shape",
        shape_type: "rectangle",
        x: 0,
        y: 0,
        width: 337.5,
        height: 48,
        color: "#15803D",
        fill: true,
        locked: false
      },
      {
        id: `el-school-title-${Date.now()}`,
        type: "text",
        value: "MADANI INTERNATIONAL ACADEMY",
        x: 10,
        y: 14,
        width: 317.5,
        height: 20,
        font_size: 13,
        color: "#ffffff",
        align: "center",
        bold: true,
        font_family: "Inter",
        locked: false
      },
      {
        id: `el-photo-${Date.now()}`,
        type: "photo",
        x: 20,
        y: 60,
        width: 90,
        height: 110,
        border_color: "#15803D",
        border_width: 2,
        border_radius: 8,
        locked: false
      },
      {
        id: `el-name-${Date.now()}`,
        type: "text",
        value: "{{name}}",
        x: 125,
        y: 65,
        width: 190,
        height: 22,
        font_size: 14,
        color: "#0F172A",
        align: "left",
        bold: true,
        font_family: "Inter",
        locked: false
      },
      {
        id: `el-id-${Date.now()}`,
        type: "text",
        value: "ID: {{member_id}}",
        x: 125,
        y: 92,
        width: 190,
        height: 18,
        font_size: 11,
        color: "#15803D",
        align: "left",
        bold: true,
        font_family: "Inter",
        locked: false
      },
      {
        id: `el-class-${Date.now()}`,
        type: "text",
        value: "Class: {{class}}",
        x: 125,
        y: 114,
        width: 190,
        height: 18,
        font_size: 10,
        color: "#334155",
        align: "left",
        bold: false,
        font_family: "Inter",
        locked: false
      },
      {
        id: `el-blood-${Date.now()}`,
        type: "text",
        value: "Blood Group: {{blood_group}}",
        x: 125,
        y: 134,
        width: 190,
        height: 18,
        font_size: 10,
        color: "#DC2626",
        align: "left",
        bold: true,
        font_family: "Inter",
        locked: false
      },
      {
        id: `el-qr-${Date.now()}`,
        type: "qr",
        x: 270,
        y: 145,
        width: 55,
        height: 55,
        locked: false
      }
    ];

    const defaultBack = [
      {
        id: `el-back-hdr-${Date.now()}`,
        type: "shape",
        shape_type: "rectangle",
        x: 0,
        y: 0,
        width: 337.5,
        height: 32,
        color: "#14532D",
        fill: true,
        locked: false
      },
      {
        id: `el-back-title-${Date.now()}`,
        type: "text",
        value: "EMERGENCY CONTACT & RULES",
        x: 10,
        y: 8,
        width: 317.5,
        height: 16,
        font_size: 10,
        color: "#ffffff",
        align: "center",
        bold: true,
        font_family: "Inter",
        locked: false
      },
      {
        id: `el-emergency-${Date.now()}`,
        type: "text",
        value: "Emergency Phone: {{emergency_phone}}\nAddress: {{address}}\n\nThis card is property of the institution. If found, please return to the administration office.",
        x: 20,
        y: 45,
        width: 297.5,
        height: 80,
        font_size: 9,
        color: "#334155",
        align: "left",
        bold: false,
        font_family: "Inter",
        locked: false
      },
      {
        id: `el-barcode-${Date.now()}`,
        type: "barcode",
        x: 50,
        y: 145,
        width: 237.5,
        height: 45,
        locked: false
      }
    ];

    setFrontElements(defaultFront);
    setBackElements(defaultBack);
    setFrontBgColor("#FFFFFF");
    setBackBgColor("#FFFFFF");
    setHistory([{ front: defaultFront, back: defaultBack, frontColor: "#FFFFFF", backColor: "#FFFFFF", frontImg: "", backImg: "" }]);
    setHistoryIndex(0);
  };

  const createNewTemplate = async (name: string) => {
    if (!selectedOrgId) return;
    try {
      const created = await api.createTemplate({
        name,
        category: "School ID",
        card_width: orientation === "Landscape" ? 3.375 : 2.125,
        card_height: orientation === "Landscape" ? 2.125 : 3.375,
        unit: "inch",
        orientation,
        layout_data: {
          front: { elements: frontElements, background_color: frontBgColor },
          back: { elements: backElements, background_color: backBgColor }
        }
      });
      setSelectedTemplateId(created.id);
      loadOrgTemplates(selectedOrgId);
    } catch (err: any) {
      alert("Failed to create template: " + err.message);
    }
  };

  const getActiveElements = () => activeTab === "front" ? frontElements : backElements;

  const updateLayout = (newEl: any[]) => {
    if (activeTab === "front") {
      setFrontElements(newEl);
      pushHistory(newEl, backElements, frontBgColor, backBgColor, frontBgImage, backBgImage);
    } else {
      setBackElements(newEl);
      pushHistory(frontElements, newEl, frontBgColor, backBgColor, frontBgImage, backBgImage);
    }
    setSaveStatus("Unsaved changes...");
  };

  const pushHistory = (newFront: any[], newBack: any[], newFrontColor: string, newBackColor: string, newFrontImg: string, newBackImg: string) => {
    const snapshot = JSON.parse(JSON.stringify({
      front: newFront,
      back: newBack,
      frontColor: newFrontColor,
      backColor: newBackColor,
      frontImg: newFrontImg,
      backImg: newBackImg
    }));
    const truncated = history.slice(0, historyIndex + 1);
    setHistory([...truncated, snapshot]);
    setHistoryIndex(truncated.length);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      const snap = history[prevIdx];
      setFrontElements(snap.front);
      setBackElements(snap.back);
      setFrontBgColor(snap.frontColor);
      setBackBgColor(snap.backColor);
      setFrontBgImage(snap.frontImg);
      setBackBgImage(snap.backImg);
      setSaveStatus("Unsaved changes...");
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      const snap = history[nextIdx];
      setFrontElements(snap.front);
      setBackElements(snap.back);
      setFrontBgColor(snap.frontColor);
      setBackBgColor(snap.backColor);
      setFrontBgImage(snap.frontImg);
      setBackBgImage(snap.backImg);
      setSaveStatus("Unsaved changes...");
    }
  };

  const handleSave = async () => {
    if (!selectedTemplateId) {
      alert("Please create or select a template first.");
      return;
    }
    setSaving(true);
    setSaveStatus("Saving...");
    try {
      const layoutData = {
        front: {
          background_color: frontBgColor,
          background_image: frontBgImage,
          canvas_width: orientation === "Landscape" ? 337.5 : 212.5,
          canvas_height: orientation === "Landscape" ? 212.5 : 337.5,
          elements: frontElements
        },
        back: {
          background_color: backBgColor,
          background_image: backBgImage,
          canvas_width: orientation === "Landscape" ? 337.5 : 212.5,
          canvas_height: orientation === "Landscape" ? 212.5 : 337.5,
          elements: backElements
        }
      };
      await api.saveTemplateVersion(selectedTemplateId, layoutData);
      setSaveStatus("Saved ✓");
    } catch (err: any) {
      console.error(err);
      setSaveStatus("Failed to save ⚠️");
    } finally {
      setSaving(false);
    }
  };

  // Canvas Dimensions (CR80 ratio: 86 x 54 mm = 337.5 x 212.5 px scaled)
  const cardW = orientation === "Landscape" ? 337.5 : 212.5;
  const cardH = orientation === "Landscape" ? 212.5 : 337.5;

  const handleAddElement = (type: string) => {
    const newId = `el-${Date.now()}`;
    const newEl: any = {
      id: newId,
      type,
      x: 30,
      y: 50,
      width: type === "qr" || type === "logo" ? 60 : type === "barcode" ? 180 : type === "photo" ? 80 : 150,
      height: type === "qr" || type === "logo" ? 60 : type === "barcode" ? 40 : type === "photo" ? 100 : 25,
      bold: false,
      italic: false,
      locked: false,
      font_family: "Inter"
    };

    if (type === "text") {
      newEl.value = "New Text Label";
      newEl.font_size = 11;
      newEl.color = "#0F172A";
      newEl.align = "left";
    } else if (type === "shape") {
      newEl.shape_type = "rectangle";
      newEl.color = "#15803D";
      newEl.fill = true;
    } else if (type === "line") {
      newEl.color = "#15803D";
      newEl.thickness = 2;
    }

    updateLayout([...getActiveElements(), newEl]);
    setSelectedElementId(newId);
  };

  const handleAddDynamicPlaceholder = (token: string) => {
    const newId = `el-${Date.now()}`;
    const newEl = {
      id: newId,
      type: "text",
      value: token,
      x: 40,
      y: 60,
      width: 160,
      height: 22,
      font_size: 12,
      color: "#0F172A",
      align: "left",
      bold: true,
      italic: false,
      locked: false,
      font_family: "Inter"
    };
    updateLayout([...getActiveElements(), newEl]);
    setSelectedElementId(newId);
  };

  // Dragging & Moving logic
  const handleElementMouseDown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedElementId(id);
    const elements = getActiveElements();
    const el = elements.find(item => item.id === id);
    if (!el || el.locked) return;

    dragInfo.current = {
      isDragging: true,
      mode: "translate",
      startX: e.clientX,
      startY: e.clientY,
      initialX: el.x,
      initialY: el.y,
      initialWidth: el.width || 50,
      initialHeight: el.height || 25
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragInfo.current.isDragging || !selectedElementId) return;

    const dx = (e.clientX - dragInfo.current.startX) / zoom;
    const dy = (e.clientY - dragInfo.current.startY) / zoom;

    const list = getActiveElements().map(el => {
      if (el.id === selectedElementId && !el.locked) {
        let nextX = dragInfo.current.initialX + dx;
        let nextY = dragInfo.current.initialY + dy;
        if (snapToGrid) {
          nextX = Math.round(nextX / 10) * 10;
          nextY = Math.round(nextY / 10) * 10;
        }
        return {
          ...el,
          x: Math.max(0, Math.min(cardW - (el.width || 20), nextX)),
          y: Math.max(0, Math.min(cardH - (el.height || 10), nextY))
        };
      }
      return el;
    });

    if (activeTab === "front") setFrontElements(list);
    else setBackElements(list);
  };

  const handleMouseUp = () => {
    if (dragInfo.current.isDragging) {
      dragInfo.current.isDragging = false;
      pushHistory(frontElements, backElements, frontBgColor, backBgColor, frontBgImage, backBgImage);
    }
  };

  const selectedElement = getActiveElements().find(el => el.id === selectedElementId);

  const updateSelectedElement = (key: string, value: any) => {
    if (!selectedElementId) return;
    const list = getActiveElements().map(el => {
      if (el.id === selectedElementId) {
        return { ...el, [key]: value };
      }
      return el;
    });
    updateLayout(list);
  };

  const deleteSelectedElement = () => {
    if (!selectedElementId) return;
    const list = getActiveElements().filter(el => el.id !== selectedElementId);
    updateLayout(list);
    setSelectedElementId(null);
  };

  const duplicateSelectedElement = () => {
    if (!selectedElement) return;
    const dup = {
      ...selectedElement,
      id: `el-${Date.now()}`,
      x: Math.min(cardW - (selectedElement.width || 20), selectedElement.x + 15),
      y: Math.min(cardH - (selectedElement.height || 10), selectedElement.y + 15)
    };
    updateLayout([...getActiveElements(), dup]);
    setSelectedElementId(dup.id);
  };

  // Render replacement values in preview mode
  const renderDisplayValue = (val: string) => {
    if (!previewMode) return val;
    return val
      .replace(/{{name}}/g, sampleStudent.name)
      .replace(/{{member_id}}/g, sampleStudent.id)
      .replace(/{{class}}/g, sampleStudent.class)
      .replace(/{{blood_group}}/g, sampleStudent.blood)
      .replace(/{{phone}}/g, sampleStudent.phone)
      .replace(/{{dob}}/g, sampleStudent.dob)
      .replace(/{{emergency_phone}}/g, sampleStudent.phone)
      .replace(/{{address}}/g, sampleStudent.address);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] bg-slate-50 text-slate-800 -m-4 sm:-m-6 lg:-m-8">
      {/* Top Studio Control Bar */}
      <header className="h-14 border-b border-slate-200 bg-white px-5 flex items-center justify-between shrink-0 shadow-2xs z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/vendor/ai-studio"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">AI Studio</span>
          </Link>
          <span className="text-slate-300">/</span>
          <div className="flex items-center gap-2">
            <PenTool className="w-4 h-4 text-[#15803D]" />
            <span className="font-extrabold text-sm text-[#14532D]">Manual Canvas Designer</span>
          </div>

          {/* Organization Switcher */}
          <div className="ml-4 flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden md:inline">Client Org:</span>
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Center / Right Toolbar Actions */}
        <div className="flex items-center gap-2">
          {/* Undo / Redo */}
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4 text-slate-600" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4 text-slate-600" />
          </button>

          <span className="h-4 w-px bg-slate-200 mx-1" />

          {/* Orientation Toggle */}
          <button
            onClick={() => setOrientation(orientation === "Landscape" ? "Portrait" : "Landscape")}
            className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700"
          >
            {orientation} (CR80)
          </button>

          {/* Zoom */}
          <div className="hidden sm:flex items-center gap-1 border border-slate-200 rounded-lg p-0.5">
            <button 
              onClick={() => setZoom(Math.max(0.6, zoom - 0.1))} 
              className="p-1 hover:bg-slate-100 rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5 text-slate-600" />
            </button>
            <span className="text-[11px] font-mono px-1 font-bold">{Math.round(zoom * 100)}%</span>
            <button 
              onClick={() => setZoom(Math.min(1.8, zoom + 0.1))} 
              className="p-1 hover:bg-slate-100 rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </div>

          {/* Snap to Grid */}
          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`p-1.5 rounded-lg border ${
              snapToGrid ? "bg-emerald-50 border-emerald-300 text-[#15803D]" : "border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
            title="Snap to 10px Grid"
          >
            <Grid className="w-4 h-4" />
          </button>

          {/* Live Preview Toggle */}
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
              previewMode 
                ? "bg-[#14532D] text-white border-[#14532D]" 
                : "border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{previewMode ? "Exit Preview" : "Preview Data"}</span>
          </button>

          <span className="h-4 w-px bg-slate-200 mx-1" />

          {/* Save Status & Button */}
          <span className="text-xs font-semibold text-slate-500 hidden md:inline">{saveStatus}</span>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="h-8 px-3.5 bg-[#15803D] hover:bg-[#14532D] text-white font-bold text-xs flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? "Saving..." : "Save Template"}</span>
          </Button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Elements Toolbar */}
        <aside className="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0 overflow-y-auto z-10 shadow-2xs">
          <div className="p-4 border-b border-slate-100">
            <span className="text-[11px] font-extrabold uppercase text-[#14532D] tracking-wider block mb-2">
              Add Card Elements
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleAddElement("text")}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-slate-700 text-xs font-bold transition-all text-left"
              >
                <Type className="w-4 h-4 text-[#15803D]" /> Text Block
              </button>
              <button
                onClick={() => handleAddElement("photo")}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-slate-700 text-xs font-bold transition-all text-left"
              >
                <User className="w-4 h-4 text-[#15803D]" /> Photo Frame
              </button>
              <button
                onClick={() => handleAddElement("qr")}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-slate-700 text-xs font-bold transition-all text-left"
              >
                <QrCode className="w-4 h-4 text-[#15803D]" /> QR Code
              </button>
              <button
                onClick={() => handleAddElement("barcode")}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-slate-700 text-xs font-bold transition-all text-left"
              >
                <Barcode className="w-4 h-4 text-[#15803D]" /> Barcode
              </button>
              <button
                onClick={() => handleAddElement("shape")}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-slate-700 text-xs font-bold transition-all text-left"
              >
                <Square className="w-4 h-4 text-[#15803D]" /> Banner Shape
              </button>
              <button
                onClick={() => handleAddElement("line")}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-slate-700 text-xs font-bold transition-all text-left"
              >
                <Minus className="w-4 h-4 text-[#15803D]" /> Divider Line
              </button>
            </div>
          </div>

          {/* Dynamic Placeholder Tokens */}
          <div className="p-4 border-b border-slate-100 flex-1">
            <span className="text-[11px] font-extrabold uppercase text-[#14532D] tracking-wider block mb-2">
              Dynamic Student Fields
            </span>
            <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
              Click to insert automated placeholders mapped directly to student records:
            </p>
            <div className="space-y-1.5">
              {[
                { token: "{{name}}", label: "Student Full Name" },
                { token: "{{member_id}}", label: "Admission / Roll ID" },
                { token: "{{class}}", label: "Class & Section" },
                { token: "{{blood_group}}", label: "Blood Group" },
                { token: "{{dob}}", label: "Date of Birth" },
                { token: "{{phone}}", label: "Parent Phone" },
                { token: "{{address}}", label: "Home Address" }
              ].map(item => (
                <button
                  key={item.token}
                  onClick={() => handleAddDynamicPlaceholder(item.token)}
                  className="w-full flex items-center justify-between p-2 rounded-lg border border-slate-100 hover:border-emerald-300 hover:bg-emerald-50 text-left text-xs transition-colors"
                >
                  <span className="font-semibold text-slate-700">{item.label}</span>
                  <span className="font-mono text-[10px] text-[#15803D] bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                    {item.token}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Background Styling */}
          <div className="p-4">
            <span className="text-[11px] font-extrabold uppercase text-[#14532D] tracking-wider block mb-2">
              Card Background
            </span>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Background Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={activeTab === "front" ? frontBgColor : backBgColor}
                    onChange={(e) => {
                      if (activeTab === "front") setFrontBgColor(e.target.value);
                      else setBackBgColor(e.target.value);
                      pushHistory(frontElements, backElements, activeTab === "front" ? e.target.value : frontBgColor, activeTab === "back" ? e.target.value : backBgColor, frontBgImage, backBgImage);
                    }}
                    className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0"
                  />
                  <input
                    type="text"
                    value={activeTab === "front" ? frontBgColor : backBgColor}
                    onChange={(e) => {
                      if (activeTab === "front") setFrontBgColor(e.target.value);
                      else setBackBgColor(e.target.value);
                    }}
                    className="flex-1 px-2.5 py-1 text-xs font-mono border border-slate-200 rounded"
                  />
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Center Canvas Work Area */}
        <main 
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={() => setSelectedElementId(null)}
          className="flex-1 overflow-auto bg-slate-100 flex flex-col items-center justify-center p-8 relative select-none"
        >
          {/* Front / Back Side Switcher */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white rounded-xl p-1 shadow-sm border border-slate-200 flex items-center gap-1 z-10">
            <button
              onClick={() => { setActiveTab("front"); setSelectedElementId(null); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "front" ? "bg-[#15803D] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Front Side
            </button>
            <button
              onClick={() => { setActiveTab("back"); setSelectedElementId(null); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "back" ? "bg-[#15803D] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Back Side
            </button>
          </div>

          {/* CR80 Standard Canvas */}
          <div 
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "center center",
              transition: "transform 0.15s ease-out"
            }}
            className="relative"
          >
            <div
              ref={canvasRef}
              style={{
                width: `${cardW}px`,
                height: `${cardH}px`,
                backgroundColor: activeTab === "front" ? frontBgColor : backBgColor,
                boxShadow: "0 20px 40px -15px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)"
              }}
              className="rounded-2xl relative overflow-hidden transition-colors border border-slate-300"
            >
              {/* Elements */}
              {getActiveElements().map((el) => {
                const isSelected = el.id === selectedElementId;

                return (
                  <div
                    key={el.id}
                    onMouseDown={(e) => handleElementMouseDown(el.id, e)}
                    style={{
                      position: "absolute",
                      left: `${el.x}px`,
                      top: `${el.y}px`,
                      width: `${el.width}px`,
                      height: `${el.height}px`,
                      zIndex: isSelected ? 30 : 10,
                      cursor: el.locked ? "default" : "move"
                    }}
                    className={`group ${isSelected && !previewMode ? "ring-2 ring-emerald-500 rounded" : ""}`}
                  >
                    {/* Render Content Based on Element Type */}
                    {el.type === "text" && (
                      <div
                        style={{
                          fontSize: `${el.font_size || 11}px`,
                          color: el.color || "#000000",
                          textAlign: el.align || "left",
                          fontWeight: el.bold ? "bold" : "normal",
                          fontStyle: el.italic ? "italic" : "normal",
                          fontFamily: el.font_family || "Inter",
                          whiteSpace: "pre-wrap"
                        }}
                        className="w-full h-full flex items-center leading-tight truncate"
                      >
                        {renderDisplayValue(el.value || "")}
                      </div>
                    )}

                    {el.type === "shape" && (
                      <div
                        style={{
                          backgroundColor: el.color || "#15803D",
                          borderRadius: `${el.border_radius || 0}px`
                        }}
                        className="w-full h-full"
                      />
                    )}

                    {el.type === "line" && (
                      <div
                        style={{
                          height: `${el.thickness || 2}px`,
                          backgroundColor: el.color || "#15803D"
                        }}
                        className="w-full"
                      />
                    )}

                    {el.type === "photo" && (
                      <div 
                        style={{
                          border: `${el.border_width || 2}px solid ${el.border_color || "#15803D"}`,
                          borderRadius: `${el.border_radius || 8}px`
                        }}
                        className="w-full h-full overflow-hidden bg-slate-100 flex items-center justify-center relative shadow-xs"
                      >
                        {previewMode ? (
                          <img 
                            src={sampleStudent.photo} 
                            alt="Student portrait" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-400">
                            <User className="w-8 h-8 text-[#15803D]" />
                            <span className="text-[9px] font-bold mt-1 text-[#14532D]">PHOTO FRAME</span>
                          </div>
                        )}
                      </div>
                    )}

                    {el.type === "qr" && (
                      <div className="w-full h-full bg-white p-1 rounded border border-slate-200 flex items-center justify-center">
                        <QrCode className="w-full h-full text-[#14532D]" />
                      </div>
                    )}

                    {el.type === "barcode" && (
                      <div className="w-full h-full bg-white px-2 py-1 rounded border border-slate-200 flex items-center justify-center">
                        <Barcode className="w-full h-full text-slate-900" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        {/* Right Property Inspector Sidebar */}
        <aside className="w-72 border-l border-slate-200 bg-white flex flex-col shrink-0 overflow-y-auto z-10 shadow-2xs">
          <div className="p-4 border-b border-slate-100">
            <span className="text-[11px] font-extrabold uppercase text-[#14532D] tracking-wider block mb-1">
              Properties Inspector
            </span>
            <p className="text-[11px] text-slate-500">
              {selectedElement ? `Selected: ${selectedElement.type.toUpperCase()}` : "Select an element to edit properties"}
            </p>
          </div>

          {selectedElement ? (
            <div className="p-4 space-y-4">
              {/* Geometry (X, Y, W, H) */}
              <div>
                <span className="text-[11px] font-bold text-slate-600 uppercase block mb-1.5">Geometry</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 block">X Pos</label>
                    <input
                      type="number"
                      value={Math.round(selectedElement.x)}
                      onChange={(e) => updateSelectedElement("x", Number(e.target.value))}
                      className="w-full px-2 py-1 border border-slate-200 rounded font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Y Pos</label>
                    <input
                      type="number"
                      value={Math.round(selectedElement.y)}
                      onChange={(e) => updateSelectedElement("y", Number(e.target.value))}
                      className="w-full px-2 py-1 border border-slate-200 rounded font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Width</label>
                    <input
                      type="number"
                      value={Math.round(selectedElement.width)}
                      onChange={(e) => updateSelectedElement("width", Number(e.target.value))}
                      className="w-full px-2 py-1 border border-slate-200 rounded font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Height</label>
                    <input
                      type="number"
                      value={Math.round(selectedElement.height)}
                      onChange={(e) => updateSelectedElement("height", Number(e.target.value))}
                      className="w-full px-2 py-1 border border-slate-200 rounded font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Text Properties */}
              {selectedElement.type === "text" && (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-600 uppercase block">Typography</span>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Text Content / Field</label>
                    <input
                      type="text"
                      value={selectedElement.value || ""}
                      onChange={(e) => updateSelectedElement("value", e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Font Size</label>
                      <input
                        type="number"
                        min={6}
                        max={36}
                        value={selectedElement.font_size || 11}
                        onChange={(e) => updateSelectedElement("font_size", Number(e.target.value))}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Color</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={selectedElement.color || "#000000"}
                          onChange={(e) => updateSelectedElement("color", e.target.value)}
                          className="w-7 h-7 rounded border border-slate-300 p-0 cursor-pointer"
                        />
                        <span className="font-mono text-[10px]">{selectedElement.color}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => updateSelectedElement("bold", !selectedElement.bold)}
                      className={`px-2.5 py-1 text-xs rounded border font-bold ${
                        selectedElement.bold ? "bg-[#15803D] text-white border-[#15803D]" : "border-slate-200"
                      }`}
                    >
                      B
                    </button>
                    <button
                      onClick={() => updateSelectedElement("italic", !selectedElement.italic)}
                      className={`px-2.5 py-1 text-xs rounded border italic ${
                        selectedElement.italic ? "bg-[#15803D] text-white border-[#15803D]" : "border-slate-200"
                      }`}
                    >
                      I
                    </button>
                    <div className="flex border border-slate-200 rounded p-0.5 ml-auto">
                      <button
                        onClick={() => updateSelectedElement("align", "left")}
                        className={`p-1 rounded ${selectedElement.align === "left" ? "bg-slate-200" : ""}`}
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => updateSelectedElement("align", "center")}
                        className={`p-1 rounded ${selectedElement.align === "center" ? "bg-slate-200" : ""}`}
                      >
                        <AlignCenter className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => updateSelectedElement("align", "right")}
                        className={`p-1 rounded ${selectedElement.align === "right" ? "bg-slate-200" : ""}`}
                      >
                        <AlignRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Shape Color */}
              {(selectedElement.type === "shape" || selectedElement.type === "line") && (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-600 uppercase block">Shape Color</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedElement.color || "#15803D"}
                      onChange={(e) => updateSelectedElement("color", e.target.value)}
                      className="w-8 h-8 rounded border border-slate-300 p-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={selectedElement.color || "#15803D"}
                      onChange={(e) => updateSelectedElement("color", e.target.value)}
                      className="flex-1 px-2.5 py-1 text-xs font-mono border border-slate-200 rounded"
                    />
                  </div>
                </div>
              )}

              {/* Actions: Duplicate & Delete */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <button
                  onClick={duplicateSelectedElement}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" /> Duplicate Element
                </button>
                <button
                  onClick={deleteSelectedElement}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Element
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              <Move className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              Click on any text, photo frame, QR code, or shape on the canvas to inspect and edit its properties.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default function VendorDesignStudioPage() {
  return (
    <Suspense fallback={
      <div className="p-12 text-center text-slate-600 font-bold">
        Loading Vendor Manual Canvas Designer...
      </div>
    }>
      <VendorDesignerContent />
    </Suspense>
  );
}
