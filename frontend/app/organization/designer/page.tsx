"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Palette
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function DesignerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("template_id");

  const [template, setTemplate] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"front" | "back">("front");
  
  // Design Elements
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

  // School branding asset state
  const [branding, setBranding] = useState<any>(null);

  // Zoom factor
  const [zoom, setZoom] = useState(1.0);

  // Undo / Redo History Stack state
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Clipboard copy/paste state
  const [clipboard, setClipboard] = useState<any>(null);

  // Sample Preview State
  const [sampleStudent, setSampleStudent] = useState({
    name: "Mohamed Yunus",
    id: "MAM226001",
    class: "III Year AI & DS",
    blood: "O+"
  });

  const [orientation, setOrientation] = useState<"Landscape" | "Portrait">("Landscape");
  const [snapToGrid, setSnapToGrid] = useState(false);

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

  useEffect(() => {
    if (templateId) {
      loadTemplate();
    }
  }, [templateId]);

  const loadTemplate = async () => {
    try {
      const res = await api.getTemplateDetails(templateId!);
      setTemplate(res);
      setOrientation(res.orientation || "Landscape");

      // Load school logo and branding colors
      try {
        const brandRes = await api.getBranding();
        setBranding(brandRes);
      } catch (err) {
        console.error("Failed to load school branding assets: ", err);
      }
      
      const latestVer = res.versions[res.versions.length - 1];
      if (latestVer) {
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

        // Seed initial history
        const initial = {
          front,
          back,
          frontColor,
          backColor,
          frontImg,
          backImg
        };
        setHistory([initial]);
        setHistoryIndex(0);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to load template layout.");
    } finally {
      setLoading(false);
    }
  };

  const getActiveElements = () => activeTab === "front" ? frontElements : backElements;
  
  const setActiveElements = (newEl: any[]) => {
    if (activeTab === "front") {
      setFrontElements(newEl);
    } else {
      setBackElements(newEl);
    }
    setSaveStatus("Changes unsaved...");
  };

  // History action pusher wrapper
  const updateLayout = (newEl: any[]) => {
    if (activeTab === "front") {
      setFrontElements(newEl);
      pushHistory(newEl, backElements, frontBgColor, backBgColor, frontBgImage, backBgImage);
    } else {
      setBackElements(newEl);
      pushHistory(frontElements, newEl, frontBgColor, backBgColor, frontBgImage, backBgImage);
    }
    setSaveStatus("Changes unsaved...");
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
      const snapshot = history[prevIdx];
      setFrontElements(snapshot.front);
      setBackElements(snapshot.back);
      setFrontBgColor(snapshot.frontColor);
      setBackBgColor(snapshot.backColor);
      setFrontBgImage(snapshot.frontImg);
      setBackBgImage(snapshot.backImg);
      setSaveStatus("Changes unsaved...");
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      const snapshot = history[nextIdx];
      setFrontElements(snapshot.front);
      setBackElements(snapshot.back);
      setFrontBgColor(snapshot.frontColor);
      setBackBgColor(snapshot.backColor);
      setFrontBgImage(snapshot.frontImg);
      setBackBgImage(snapshot.backImg);
      setSaveStatus("Changes unsaved...");
    }
  };

  const handleSave = async (currentOrient?: string) => {
    if (!templateId) return;
    setSaving(true);
    setSaveStatus("Saving...");
    try {
      const layoutData = {
        front: {
          background_color: frontBgColor,
          background_image: frontBgImage,
          canvas_width: 337.5,
          canvas_height: 212.5,
          elements: frontElements
        },
        back: {
          background_color: backBgColor,
          background_image: backBgImage,
          canvas_width: 337.5,
          canvas_height: 212.5,
          elements: backElements
        }
      };
      
      await api.saveTemplateVersion(templateId, layoutData);
      setSaveStatus("Saved ✓");
    } catch (err) {
      setSaveStatus("Failed to save ⚠️");
    } finally {
      setSaving(false);
    }
  };

  // Debounced Autosave effect
  useEffect(() => {
    if (saveStatus !== "Changes unsaved...") return;
    const timer = setTimeout(() => {
      handleSave();
    }, 1500);
    return () => clearTimeout(timer);
  }, [saveStatus, frontElements, backElements, frontBgColor, backBgColor, frontBgImage, backBgImage]);

  // Keyboard Shortcuts integration listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.tagName === "SELECT"
      ) {
        return;
      }

      const ctrlCmd = e.ctrlKey || e.metaKey;

      if (ctrlCmd && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if (ctrlCmd && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      }
      if (ctrlCmd && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        handleDeleteSelected();
      }
      if (ctrlCmd && e.key === "c") {
        e.preventDefault();
        if (selectedElementId) {
          const el = getActiveElements().find(item => item.id === selectedElementId);
          if (el) setClipboard(JSON.parse(JSON.stringify(el)));
        }
      }
      if (ctrlCmd && e.key === "v") {
        e.preventDefault();
        if (clipboard) {
          const pasted = {
            ...clipboard,
            id: `el-${Date.now()}`,
            x: clipboard.x + 15,
            y: clipboard.y + 15
          };
          updateLayout([...getActiveElements(), pasted]);
          setSelectedElementId(pasted.id);
        }
      }
      if (ctrlCmd && e.key === "d") {
        e.preventDefault();
        if (selectedElementId) {
          const el = getActiveElements().find(item => item.id === selectedElementId);
          if (el) {
            const dup = {
              ...el,
              id: `el-${Date.now()}`,
              x: el.x + 15,
              y: el.y + 15
            };
            updateLayout([...getActiveElements(), dup]);
            setSelectedElementId(dup.id);
          }
        }
      }
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key) && selectedElementId) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const list = getActiveElements().map(el => {
          if (el.id === selectedElementId && !el.locked) {
            let nextX = el.x;
            let nextY = el.y;
            if (e.key === "ArrowLeft") nextX -= step;
            if (e.key === "ArrowRight") nextX += step;
            if (e.key === "ArrowUp") nextY -= step;
            if (e.key === "ArrowDown") nextY += step;
            return { ...el, x: nextX, y: nextY };
          }
          return el;
        });
        setActiveElements(list);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedElementId, clipboard, activeTab, frontElements, backElements, historyIndex, history]);

  // Card orientation dimensions
  const cardW = orientation === "Landscape" ? 337.5 : 212.5;
  const cardH = orientation === "Landscape" ? 212.5 : 337.5;

  const handleAddElement = (type: string) => {
    const newId = `el-${Date.now()}`;
    const newEl: any = {
      id: newId,
      type,
      x: 30,
      y: 50,
      width: type === "qr" || type === "logo" || type === "barcode" ? 60 : 150,
      height: type === "qr" || type === "logo" ? 50 : type === "barcode" ? 30 : 25,
      bold: false,
      italic: false,
      locked: false,
      hidden: false,
      font_family: "Inter"
    };

    if (type === "text") {
      newEl.value = "New Text Block";
      newEl.font_size = 10;
      newEl.color = "#000000";
      newEl.align = "left";
    } else if (type === "shape") {
      newEl.shape_type = "rectangle";
      newEl.color = "#000000";
      newEl.fill = true;
    } else if (type === "line") {
      newEl.color = "#000000";
      newEl.thickness = 2;
    } else if (type === "signature") {
      newEl.width = 100;
      newEl.height = 30;
      newEl.value = "";
    }

    updateLayout([...getActiveElements(), newEl]);
    setSelectedElementId(newId);
  };

  const handleAddDynamicField = (token: string) => {
    const newId = `el-${Date.now()}`;
    const newEl = {
      id: newId,
      type: "text",
      value: token,
      x: 30,
      y: 60,
      width: 150,
      height: 20,
      font_size: 10,
      color: "#000000",
      align: "left",
      bold: true,
      italic: false,
      locked: false,
      hidden: false,
      font_family: "Inter"
    };
    updateLayout([...getActiveElements(), newEl]);
    setSelectedElementId(newId);
  };

  const alignElement = (alignment: "left" | "center" | "right" | "top" | "middle" | "bottom") => {
    if (!selectedElementId) return;
    const list = getActiveElements().map(el => {
      if (el.id === selectedElementId && !el.locked) {
        let nextX = el.x;
        let nextY = el.y;
        if (alignment === "left") nextX = 0;
        if (alignment === "center") nextX = Math.round((cardW - el.width) / 2);
        if (alignment === "right") nextX = cardW - el.width;
        if (alignment === "top") nextY = 0;
        if (alignment === "middle") nextY = Math.round((cardH - el.height) / 2);
        if (alignment === "bottom") nextY = cardH - el.height;
        return { ...el, x: nextX, y: nextY };
      }
      return el;
    });
    updateLayout(list);
  };

  const handleSelectElement = (id: string, e: React.MouseEvent) => {
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

  const handleResizeStart = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedElementId(id);
    const elements = getActiveElements();
    const el = elements.find(item => item.id === id);
    if (!el || el.locked) return;

    dragInfo.current = {
      isDragging: true,
      mode: "resize",
      startX: e.clientX,
      startY: e.clientY,
      initialX: el.x,
      initialY: el.y,
      initialWidth: el.width || 50,
      initialHeight: el.height || 25
    };
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!dragInfo.current.isDragging || !selectedElementId) return;

    // Scale movement delta by zoom factor
    const dx = (e.clientX - dragInfo.current.startX) / zoom;
    const dy = (e.clientY - dragInfo.current.startY) / zoom;

    const list = getActiveElements().map(el => {
      if (el.id === selectedElementId && !el.locked) {
        if (dragInfo.current.mode === "translate") {
          let newX = Math.round(dragInfo.current.initialX + dx);
          let newY = Math.round(dragInfo.current.initialY + dy);
          if (snapToGrid || e.shiftKey) {
            newX = Math.round(newX / 10) * 10;
            newY = Math.round(newY / 10) * 10;
          }
          return { ...el, x: newX, y: newY };
        } else {
          let newW = Math.round(dragInfo.current.initialWidth + dx);
          let newH = Math.round(dragInfo.current.initialHeight + dy);
          newW = Math.max(10, newW);
          newH = Math.max(5, newH);
          if (snapToGrid || e.shiftKey) {
            newW = Math.round(newW / 10) * 10;
            newH = Math.round(newH / 10) * 10;
          }
          return { ...el, width: newW, height: newH };
        }
      }
      return el;
    });
    setActiveElements(list);
  };

  const handleCanvasMouseUp = () => {
    if (dragInfo.current.isDragging) {
      dragInfo.current.isDragging = false;
      // Drag ended: commit snap history record
      updateLayout(getActiveElements());
    }
  };

  const updateSelectedProperty = (key: string, value: any) => {
    if (!selectedElementId) return;
    const updated = getActiveElements().map(el => {
      if (el.id === selectedElementId) {
        return { ...el, [key]: value };
      }
      return el;
    });
    updateLayout(updated);
  };

  const handleDeleteSelected = () => {
    if (!selectedElementId) return;
    const updated = getActiveElements().filter(el => el.id !== selectedElementId);
    updateLayout(updated);
    setSelectedElementId(null);
  };

  // Reordering / z-index shifts
  const moveLayer = (id: string, direction: "up" | "down" | "top" | "bottom") => {
    const list = [...getActiveElements()];
    const idx = list.findIndex(el => el.id === id);
    if (idx === -1) return;
    
    const item = list[idx];
    list.splice(idx, 1);
    
    if (direction === "up") {
      const newIdx = Math.min(list.length, idx + 1);
      list.splice(newIdx, 0, item);
    } else if (direction === "down") {
      const newIdx = Math.max(0, idx - 1);
      list.splice(newIdx, 0, item);
    } else if (direction === "top") {
      list.push(item);
    } else if (direction === "bottom") {
      list.unshift(item);
    }
    updateLayout(list);
  };

  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        if (activeTab === "front") setFrontBgImage(dataUrl);
        else setBackBgImage(dataUrl);
        pushHistory(frontElements, backElements, frontBgColor, backBgColor, activeTab === "front" ? dataUrl : frontBgImage, activeTab === "back" ? dataUrl : backBgImage);
        setSaveStatus("Changes unsaved...");
      };
      reader.readAsDataURL(file);
    }
  };

  const resolveToken = (val: string) => {
    if (!val) return "";
    return val
      .replace("{{student.name}}", sampleStudent.name)
      .replace("{{student.id}}", sampleStudent.id)
      .replace("{{student.class}}", sampleStudent.class)
      .replace("{{student.blood_group}}", sampleStudent.blood)
      .replace("{{organization.name}}", "MADANI ACADEMY")
      .replace("{{organization.short_name}}", "MADANI");
  };

  const getFileUrl = (path: string | null) => {
    if (!path) return "";
    if (path.startsWith("data:") || path.startsWith("blob:")) return path;
    const isPort8001 = typeof window !== "undefined" && (window.location.port === "3001" || window.location.port === "8001" || window.location.href.includes(":3001"));
    const base = isPort8001 ? "http://localhost:8001" : "http://localhost:8000";
    return `${base}${path}`;
  };

  const selectedEl = getActiveElements().find(el => el.id === selectedElementId);

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Loading Canvas designer editor...</div>;
  }

  return (
    <div className="flex flex-col select-none bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-sm h-[calc(100vh-120px)] w-full">
      {/* Editor Header Toolbar - Premium Canva Style */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 px-6 py-3 bg-white shrink-0 shadow-sm z-20">
        <div>
          <h1 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Palette className="w-4 h-4 text-[#15803D]" /> Card Designer: <span className="text-[#15803D] font-bold">{template?.name}</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-semibold">Auto-saving enabled. Drag items to position, pull corner handles to resize.</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Undo / Redo controls */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5 shadow-sm">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="px-2.5 py-1 text-slate-600 hover:text-[#15803D] disabled:opacity-30 text-[10px] font-bold transition-all flex items-center gap-1"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3 h-3" /> Undo
            </button>
            <div className="w-[1px] h-3.5 bg-slate-200"></div>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="px-2.5 py-1 text-slate-600 hover:text-[#15803D] disabled:opacity-30 text-[10px] font-bold transition-all flex items-center gap-1"
              title="Redo (Ctrl+Shift+Z)"
            >
              Redo <Redo2 className="w-3 h-3" />
            </button>
          </div>

          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
            saveStatus.startsWith("Saved") ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"
          }`}>
            {saveStatus}
          </span>
          <button 
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="px-4 py-1.5 bg-[#15803D] hover:bg-[#14532D] text-white font-bold rounded-lg text-[10px] shadow-sm transition-colors flex items-center gap-1"
          >
            <Save className="w-3 h-3" /> {saving ? "Saving..." : "Save Layout"}
          </button>
          <button 
            type="button"
            onClick={() => router.push("/organization/templates")}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10px] font-bold rounded-lg shadow-sm"
          >
            Templates
          </button>
        </div>
      </div>

      {/* Canva Split Workspace Layout */}
      <div className="flex flex-1 overflow-hidden h-full relative">
        
        {/* Left Elements Toolbar */}
        <div className="w-72 border-r border-slate-200 bg-white overflow-y-auto h-full p-5 space-y-6 shrink-0 z-10 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Add Layout Elements</h4>
              <div className="grid grid-cols-2 gap-1.5">
                <button type="button" onClick={() => handleAddElement("text")} className="p-2 bg-slate-50 hover:bg-emerald-50 hover:text-[#15803D] border border-slate-200 text-slate-700 text-[10px] font-bold rounded text-left transition-all flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-[#15803D] shrink-0" /> Text Block
                </button>
                <button type="button" onClick={() => handleAddElement("photo")} className="p-2 bg-slate-50 hover:bg-emerald-50 hover:text-[#15803D] border border-slate-200 text-slate-700 text-[10px] font-bold rounded text-left transition-all flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#15803D] shrink-0" /> Photo Frame
                </button>
                <button type="button" onClick={() => handleAddElement("logo")} className="p-2 bg-slate-50 hover:bg-emerald-50 hover:text-[#15803D] border border-slate-200 text-slate-700 text-[10px] font-bold rounded text-left transition-all flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#15803D] shrink-0" /> School Logo
                </button>
                <button type="button" onClick={() => handleAddElement("qr")} className="p-2 bg-slate-50 hover:bg-emerald-50 hover:text-[#15803D] border border-slate-200 text-slate-700 text-[10px] font-bold rounded text-left transition-all flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-[#15803D] shrink-0" /> QR Code
                </button>
                <button type="button" onClick={() => handleAddElement("shape")} className="p-2 bg-slate-50 hover:bg-emerald-50 hover:text-[#15803D] border border-slate-200 text-slate-700 text-[10px] font-bold rounded text-left transition-all flex items-center gap-1.5">
                  <Square className="w-3.5 h-3.5 text-[#15803D] shrink-0" /> Shape Card
                </button>
                <button type="button" onClick={() => handleAddElement("line")} className="p-2 bg-slate-50 hover:bg-emerald-50 hover:text-[#15803D] border border-slate-200 text-slate-700 text-[10px] font-bold rounded text-left transition-all flex items-center gap-1.5">
                  <Minus className="w-3.5 h-3.5 text-[#15803D] shrink-0" /> Accent Line
                </button>
                <button type="button" onClick={() => handleAddElement("barcode")} className="p-2 bg-slate-50 hover:bg-emerald-50 hover:text-[#15803D] border border-slate-200 text-slate-700 text-[10px] font-bold rounded text-left transition-all flex items-center gap-1.5">
                  <Barcode className="w-3.5 h-3.5 text-[#15803D] shrink-0" /> Barcode
                </button>
                <button type="button" onClick={() => handleAddElement("signature")} className="p-2 bg-slate-50 hover:bg-emerald-50 hover:text-[#15803D] border border-slate-200 text-slate-700 text-[10px] font-bold rounded text-left transition-all flex items-center gap-1.5">
                  <PenTool className="w-3.5 h-3.5 text-[#15803D] shrink-0" /> Signature
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dynamic Fields Tokens</h4>
              <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                {[
                  { label: "Student Name", token: "{{student.name}}" },
                  { label: "Student ID / Roll", token: "{{student.id}}" },
                  { label: "Class / Standard", token: "{{student.class}}" },
                  { label: "Blood Group", token: "{{student.blood_group}}" },
                  { label: "School Name", token: "{{organization.name}}" },
                  { label: "School Short Name", token: "{{organization.short_name}}" },
                ].map(field => (
                  <button
                    key={field.token}
                    type="button"
                    onClick={() => handleAddDynamicField(field.token)}
                    className="w-full p-2 bg-slate-50 hover:bg-emerald-50 hover:text-[#15803D] text-slate-700 border border-slate-200 text-[9px] font-mono rounded text-left font-bold transition-all"
                  >
                    + {field.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Preview Details Mock</h4>
            <select
              onChange={(e) => {
                const opt = e.target.value;
                if (opt === "yunus") {
                  setSampleStudent({ name: "Mohamed Yunus", id: "MAM226001", class: "III Year AI & DS", blood: "O+" });
                } else {
                  setSampleStudent({ name: "Aisha Siddiqua", id: "MAM226052", class: "I Year Biotech", blood: "B+" });
                }
              }}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-750 text-[10px] font-bold rounded focus:ring-1 focus:ring-[#15803D]"
            >
              <option value="yunus">Mohamed Yunus (AI & DS)</option>
              <option value="aisha">Aisha Siddiqua (Biotech)</option>
            </select>
          </div>
        </div>

        {/* Center Canvas Viewport - Figma Gray Canvas */}
        <div className="flex-1 bg-slate-100 overflow-auto h-full flex flex-col justify-between items-center p-8 relative">
          
          {/* Side Toggle Selector */}
          <div className="flex bg-slate-200 border border-slate-300 p-0.5 rounded-lg gap-0.5 shrink-0 z-10">
            <button
              type="button"
              onClick={() => { setActiveTab("front"); setSelectedElementId(null); }}
              className={`px-6 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                activeTab === "front" ? "bg-[#15803D] text-white shadow-sm" : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Front Layout
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab("back"); setSelectedElementId(null); }}
              className={`px-6 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                activeTab === "back" ? "bg-[#15803D] text-white shadow-sm" : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Back Layout
            </button>
          </div>

          {/* Designer Canvas Work Desk viewport */}
          <div className="flex-1 flex items-center justify-center w-full py-6">
            <div 
              ref={canvasRef}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              onClick={() => setSelectedElementId(null)}
              className="relative border border-slate-350 bg-white shadow-2xl overflow-hidden cursor-crosshair shrink-0 card-canvas-workspace"
              style={{ 
                width: `${cardW}px`, 
                height: `${cardH}px`,
                backgroundColor: activeTab === "front" ? frontBgColor : backBgColor,
                backgroundImage: activeTab === "front" ? (frontBgImage ? `url(${getFileUrl(frontBgImage)})` : "none") : (backBgImage ? `url(${getFileUrl(backBgImage)})` : "none"),
                backgroundSize: "cover",
                backgroundPosition: "center",
                transform: `scale(${zoom})`,
                transformOrigin: "center center"
              }}
            >
              {/* Optional Grid Lines guide background */}
              {(snapToGrid) ? (
                <div className="absolute inset-0 bg-[radial-gradient(#6366f125_1px,transparent_1px)] [background-size:10px_10px]"></div>
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(#00000008_1px,transparent_1px)] [background-size:10px_10px]"></div>
              )}

              {/* Elements list rendering loop */}
              {getActiveElements()
                .filter(el => !el.hidden)
                .map((el) => {
                  const active = el.id === selectedElementId;
                  return (
                    <div
                      key={el.id}
                      onMouseDown={(e) => handleSelectElement(el.id, e)}
                      onClick={(e) => e.stopPropagation()}
                      className={`absolute border select-none group ${
                        active ? "border-[#15803D] shadow-lg shadow-emerald-600/15 z-30" : "border-transparent hover:border-slate-400 z-10"
                      }`}
                      style={{
                        left: `${el.x}px`,
                        top: `${el.y}px`,
                        width: `${el.width}px`,
                        height: `${el.height}px`,
                      }}
                    >
                      {/* Element Type Render blocks */}
                      {el.type === "text" ? (
                        <div 
                          className="w-full h-full overflow-hidden flex items-center select-none"
                          style={{
                            color: el.color || "#000000",
                            fontSize: `${el.font_size || 10}px`,
                            fontWeight: el.bold ? "bold" : "normal",
                            fontStyle: el.italic ? "italic" : "normal",
                            fontFamily: el.font_family || "Inter",
                            justifyContent: el.align === "center" ? "center" : el.align === "right" ? "flex-end" : "flex-start",
                          }}
                        >
                          {resolveToken(el.value || "")}
                        </div>
                      ) : el.type === "photo" ? (
                        <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center border border-dashed border-slate-300">
                          <span className="text-xl">👤</span>
                          <span className="text-[6px] text-slate-500 mt-1 uppercase font-bold">Student Photo</span>
                        </div>
                      ) : el.type === "logo" ? (
                        branding?.primary_logo ? (
                          <img
                            src={getFileUrl(branding.primary_logo)}
                            alt="Logo"
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <div className="w-full h-full bg-emerald-50 border border-dashed border-emerald-200 text-[#15803D] flex flex-col items-center justify-center">
                            <span className="text-[14px]">🛡️</span>
                            <span className="text-[5px] text-slate-500 font-bold uppercase mt-0.5">School Logo</span>
                          </div>
                        )
                      ) : el.type === "qr" ? (
                        <div className="w-full h-full bg-white flex flex-col items-center justify-center p-1 border border-slate-200">
                          <div className="w-full h-full bg-[radial-gradient(#000_2px,transparent_2.5px)] [background-size:6px_6px]"></div>
                        </div>
                      ) : el.type === "shape" ? (
                        <div 
                          className="w-full h-full"
                          style={{
                            backgroundColor: el.fill ? (el.color || "#000000") : "transparent",
                            border: el.fill ? "none" : `2px solid ${el.color || "#000000"}`,
                            borderRadius: el.shape_type === "circle" ? "50%" : "0px"
                          }}
                        ></div>
                      ) : el.type === "line" ? (
                        <div 
                          className="w-full"
                          style={{
                            height: `${el.thickness || 2}px`,
                            backgroundColor: el.color || "#000000",
                          }}
                        ></div>
                      ) : el.type === "barcode" ? (
                        <div className="w-full h-full bg-white flex flex-col items-center justify-center p-1 border border-slate-250">
                          <div className="w-full h-full bg-[linear-gradient(90deg,#000_1px,transparent_1px,#000_2px,transparent_2px,#000_1px,transparent_1px,#000_3px,transparent_1px,#000_1px,transparent_3px)] [background-size:12px_100%]"></div>
                        </div>
                      ) : el.type === "signature" ? (
                        el.value ? (
                          <img
                            src={el.value}
                            alt="Signature"
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center border border-dashed border-slate-300 text-slate-400">
                            <span className="text-[9px] italic font-serif">✍️ Signature</span>
                          </div>
                        )
                      ) : null}

                      {/* Corner Resizing Anchor overlay handles */}
                      {active && !el.locked && (
                        <div 
                          onMouseDown={(e) => handleResizeStart(el.id, e)}
                          className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-[#15803D] rounded-full border border-white cursor-se-resize z-55 shadow hover:scale-125 transition-transform"
                        ></div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Footer guides & Grid snappers */}
          <div className="flex items-center gap-4 bg-white border border-slate-200 px-4 py-1.5 rounded-lg text-[10px] text-slate-500 shadow-sm shrink-0 z-10">
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="px-2 py-0.5 hover:text-[#15803D] bg-slate-50 border border-slate-200 rounded font-bold transition-all">- Zoom</button>
              <span className="px-1.5 font-mono font-bold text-slate-800">{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={() => setZoom(z => Math.min(2.0, z + 0.25))} className="px-2 py-0.5 hover:text-[#15803D] bg-slate-50 border border-slate-200 rounded font-bold transition-all">+ Zoom</button>
              <button type="button" onClick={() => setZoom(1.0)} className="text-slate-600 hover:text-[#15803D] font-bold ml-1 font-mono">Reset</button>
            </div>
            <div className="w-[1px] h-3 bg-slate-200"></div>
            <label className="flex items-center gap-1.5 cursor-pointer font-bold select-none text-slate-700">
              <input
                type="checkbox"
                checked={snapToGrid}
                onChange={(e) => setSnapToGrid(e.target.checked)}
                className="accent-[#15803D] rounded cursor-pointer w-3.5 h-3.5"
              />
              Snap Grid (10px)
            </label>
          </div>
        </div>

        {/* Right Inspector & Layer stacking Panel */}
        <div className="w-80 border-l border-slate-200 bg-white overflow-y-auto h-full p-5 space-y-5 shrink-0 flex flex-col justify-between">
        <div className="space-y-6">
          {/* 1. Element Properties Panel */}
          {selectedEl ? (
            <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-slate-150 pb-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Properties</h4>
                <button 
                  onClick={handleDeleteSelected}
                  className="px-2 py-1 bg-red-50 border border-red-200 text-red-650 text-[10px] font-bold rounded hover:bg-red-100"
                >
                  Delete Item
                </button>
              </div>

              {/* Custom Layer rename field */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Layer Label / Name</label>
                <input
                  type="text"
                  value={selectedEl.name ?? selectedEl.type.toUpperCase()}
                  onChange={(e) => updateSelectedProperty("name", e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded"
                />
              </div>

              {/* Lock & Hide togglers */}
              <div className="flex items-center gap-4 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none whitespace-nowrap">
                  <input 
                    type="checkbox" 
                    checked={selectedEl.locked || false} 
                    onChange={(e) => updateSelectedProperty("locked", e.target.checked)} 
                    className="accent-[#15803D] rounded w-4 h-4 cursor-pointer"
                  />
                  <span>🔒 Lock Item</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none whitespace-nowrap">
                  <input 
                    type="checkbox" 
                    checked={selectedEl.hidden || false} 
                    onChange={(e) => {
                      updateSelectedProperty("hidden", e.target.checked);
                      if (e.target.checked) setSelectedElementId(null);
                    }} 
                    className="accent-[#15803D] rounded w-4 h-4 cursor-pointer"
                  />
                  <span>👁️ Hide Layer</span>
                </label>
              </div>

              {/* Align Tools */}
              {!selectedEl.locked && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Canvas Align tools</label>
                  <div className="grid grid-cols-3 gap-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => alignElement("left")}
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 rounded transition-all shadow-sm"
                      title="Align Left"
                    >
                      Left
                    </button>
                    <button
                      type="button"
                      onClick={() => alignElement("center")}
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 rounded transition-all shadow-sm"
                      title="Align Center Horizontally"
                    >
                      Center X
                    </button>
                    <button
                      type="button"
                      onClick={() => alignElement("right")}
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 rounded transition-all shadow-sm"
                      title="Align Right"
                    >
                      Right
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => alignElement("top")}
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 rounded transition-all shadow-sm"
                      title="Align Top"
                    >
                      Top
                    </button>
                    <button
                      type="button"
                      onClick={() => alignElement("middle")}
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 rounded transition-all shadow-sm"
                      title="Align Center Vertically"
                    >
                      Center Y
                    </button>
                    <button
                      type="button"
                      onClick={() => alignElement("bottom")}
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 rounded transition-all shadow-sm"
                      title="Align Bottom"
                    >
                      Bottom
                    </button>
                  </div>
                </div>
              )}

              {/* Coordinates Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">X Position (px)</label>
                  <input 
                    type="number" 
                    value={selectedEl.x ?? 0}
                    disabled={selectedEl.locked}
                    onChange={(e) => updateSelectedProperty("x", parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded disabled:opacity-40"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Y Position (px)</label>
                  <input 
                    type="number" 
                    value={selectedEl.y ?? 0}
                    disabled={selectedEl.locked}
                    onChange={(e) => updateSelectedProperty("y", parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded disabled:opacity-40"
                  />
                </div>
              </div>

              {/* Size Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Width (px)</label>
                  <input 
                    type="number" 
                    value={selectedEl.width ?? 0}
                    disabled={selectedEl.locked}
                    onChange={(e) => updateSelectedProperty("width", parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded disabled:opacity-40"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Height (px)</label>
                  <input 
                    type="number" 
                    value={selectedEl.height ?? 0}
                    disabled={selectedEl.locked}
                    onChange={(e) => updateSelectedProperty("height", parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded disabled:opacity-40"
                  />
                </div>
              </div>

              {/* Text specific settings with Font Selection */}
              {selectedEl.type === "text" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Text Value</label>
                    <input 
                      type="text" 
                      value={selectedEl.value ?? ""}
                      onChange={(e) => updateSelectedProperty("value", e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Font Family</label>
                    <select
                      value={selectedEl.font_family ?? "Inter"}
                      onChange={(e) => updateSelectedProperty("font_family", e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded focus:border-emerald-500"
                    >
                      <option value="Inter">Inter (Default)</option>
                      <option value="Outfit">Outfit (Clean / Stylish)</option>
                      <option value="Playfair Display">Playfair Display (Serif)</option>
                      <option value="Montserrat">Montserrat (Geometric)</option>
                      <option value="Fira Code">Fira Code (Monospace)</option>
                      <option value="Caveat">Caveat (Handwritten Signature)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Font Size (px)</label>
                      <input 
                        type="number" 
                        value={selectedEl.font_size ?? 10}
                        onChange={(e) => updateSelectedProperty("font_size", parseInt(e.target.value) || 10)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Font Color</label>
                      <input 
                        type="color" 
                        value={selectedEl.color || "#000000"}
                        onChange={(e) => updateSelectedProperty("color", e.target.value)}
                        className="w-full h-8 bg-slate-50 border border-slate-200 rounded cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => updateSelectedProperty("bold", !selectedEl.bold)}
                      className={`flex-1 py-1 border text-xs rounded font-bold ${
                        selectedEl.bold ? "bg-[#15803D] text-white border-[#15803D]" : "bg-slate-50 border-slate-200 text-slate-600"
                      }`}
                    >
                      B
                    </button>
                    <button
                      onClick={() => updateSelectedProperty("italic", !selectedEl.italic)}
                      className={`flex-1 py-1 border text-xs rounded italic ${
                        selectedEl.italic ? "bg-[#15803D] text-white border-[#15803D]" : "bg-slate-50 border-slate-200 text-slate-600"
                      }`}
                    >
                      I
                    </button>
                  </div>
                </div>
              )}

              {/* Shape specific settings */}
              {selectedEl.type === "shape" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Shape Type</label>
                    <select
                      value={selectedEl.shape_type ?? "rectangle"}
                      onChange={(e) => updateSelectedProperty("shape_type", e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded"
                    >
                      <option value="rectangle">Rectangle</option>
                      <option value="circle">Circle</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Color</label>
                    <input 
                      type="color" 
                      value={selectedEl.color || "#000000"}
                      onChange={(e) => updateSelectedProperty("color", e.target.value)}
                      className="w-full h-8 bg-slate-50 border border-slate-200 rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id="shape-fill"
                      checked={selectedEl.fill}
                      onChange={(e) => updateSelectedProperty("fill", e.target.checked)}
                      className="rounded accent-[#15803D]"
                    />
                    <label htmlFor="shape-fill" className="text-[10px] text-slate-655 font-bold">Fill shape interior</label>
                  </div>
                </div>
              )}

              {/* Manual Signature Uploader inside editor */}
              {selectedEl.type === "signature" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-2">Upload Signature Graphic</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            updateSelectedProperty("value", reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="text-xs text-slate-500 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                    />
                    {selectedEl.value && (
                      <button
                        onClick={() => updateSelectedProperty("value", "")}
                        className="text-[9px] text-red-500 mt-2 block underline"
                      >
                        Remove uploaded signature
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-4 text-center py-6">
              <span className="text-2xl text-slate-500">⚙️</span>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Canvas Settings</h4>
              
              <div className="text-left space-y-4 mt-6">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-2">Card Orientation</label>
                  <button
                    type="button"
                    onClick={async () => {
                      const nextOrient = orientation === "Landscape" ? "Portrait" : "Landscape";
                      
                      const oldW = orientation === "Landscape" ? 337.5 : 212.5;
                      const oldH = orientation === "Landscape" ? 212.5 : 337.5;
                      const newW = nextOrient === "Landscape" ? 337.5 : 212.5;
                      const newH = nextOrient === "Landscape" ? 212.5 : 337.5;
                      
                      const scaleX = newW / oldW;
                      const scaleY = newH / oldH;
                      
                      const scaleElements = (els: any[]) => {
                        return els.map(el => {
                          if (el.locked) return el;
                          return {
                            ...el,
                            x: Math.round(el.x * scaleX),
                            y: Math.round(el.y * scaleY),
                            width: Math.round(el.width * scaleX),
                            height: Math.round(el.height * scaleY)
                          };
                        });
                      };
                      
                      const scaledFront = scaleElements(frontElements);
                      const scaledBack = scaleElements(backElements);
                      
                      setFrontElements(scaledFront);
                      setBackElements(scaledBack);
                      setOrientation(nextOrient);
                      setSaveStatus("Saving...");
                      
                      try {
                        await api.updateTemplate(templateId!, { orientation: nextOrient });
                        await api.saveTemplateVersion(templateId!, {
                          front: {
                            background_color: frontBgColor,
                            background_image: frontBgImage,
                            canvas_width: newW,
                            canvas_height: newH,
                            elements: scaledFront
                          },
                          back: {
                            background_color: backBgColor,
                            background_image: backBgImage,
                            canvas_width: newW,
                            canvas_height: newH,
                            elements: scaledBack
                          }
                        });
                        setSaveStatus("Saved ✓");
                      } catch (err) {
                        setSaveStatus("Failed ⚠️");
                      }
                    }}
                    className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs rounded font-bold shadow-sm transition-colors"
                  >
                    🔄 Switch to {orientation === "Landscape" ? "Portrait (Vertical)" : "Landscape (Horizontal)"}
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Background Color</label>
                  <input 
                    type="color" 
                    value={activeTab === "front" ? frontBgColor : backBgColor}
                    onChange={(e) => {
                      if (activeTab === "front") setFrontBgColor(e.target.value);
                      else setBackBgColor(e.target.value);
                      pushHistory(frontElements, backElements, activeTab === "front" ? e.target.value : frontBgColor, activeTab === "back" ? e.target.value : backBgColor, frontBgImage, backBgImage);
                      setSaveStatus("Changes unsaved...");
                    }}
                    className="w-full h-8 bg-slate-50 border border-slate-200 rounded cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-2">Upload Canvas Cover Background</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleBgImageUpload}
                    className="text-xs text-slate-500 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                  />
                  {(activeTab === "front" ? frontBgImage : backBgImage) && (
                    <button
                      onClick={() => {
                        if (activeTab === "front") setFrontBgImage("");
                        else setBackBgImage("");
                        setSaveStatus("Changes unsaved...");
                      }}
                      className="text-[9px] text-red-500 mt-2 block underline"
                    >
                      Remove cover background image
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2. Visual Layers Management Panel - Light Theme */}
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Layers Stack</h4>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {getActiveElements().length === 0 ? (
                <div className="text-[10px] text-slate-500 text-center py-4">No custom elements on canvas</div>
              ) : (
                [...getActiveElements()].reverse().map((layer, index) => (
                  <div 
                    key={layer.id} 
                    onClick={() => setSelectedElementId(layer.id)}
                    className={`flex items-center justify-between p-2 rounded text-[11px] font-bold cursor-pointer border ${
                      layer.id === selectedElementId 
                        ? "bg-slate-100 border-[#4ADE80] text-[#14532D]" 
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    <span className="truncate max-w-[80px] font-mono text-[9px]">
                      {layer.locked ? "🔒" : ""} {layer.name || (layer.value ? resolveToken(layer.value) : layer.type.toUpperCase())}
                    </span>
                    <div className="flex gap-1.5 items-center">
                      <button
                        title="Bring Forward"
                        onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, "up"); }}
                        className="p-1 hover:text-[#15803D]"
                      >
                        ▲
                      </button>
                      <button
                        title="Send Backward"
                        onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, "down"); }}
                        className="p-1 hover:text-[#15803D]"
                      >
                        ▼
                      </button>
                      <button
                        title="Toggle Hidden"
                        onClick={(e) => {
                          e.stopPropagation();
                          const updated = getActiveElements().map(x => x.id === layer.id ? { ...x, hidden: !x.hidden } : x);
                          updateLayout(updated);
                        }}
                        className="p-1 hover:text-[#15803D] text-[10px]"
                      >
                        {layer.hidden ? "👁️‍🗨️" : "👁️"}
                      </button>
                      <button
                        title="Toggle Lock"
                        onClick={(e) => {
                          e.stopPropagation();
                          const updated = getActiveElements().map(x => x.id === layer.id ? { ...x, locked: !x.locked } : x);
                          updateLayout(updated);
                        }}
                        className="p-1 hover:text-[#15803D] text-[10px]"
                      >
                        {layer.locked ? "🔑" : "🔒"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

export default function DesignerPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">Loading editor parameters...</div>}>
      <DesignerContent />
    </Suspense>
  );
}
