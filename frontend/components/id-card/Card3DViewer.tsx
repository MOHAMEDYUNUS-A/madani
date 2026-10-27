"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  RotateCw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2, 
  RefreshCcw, 
  QrCode, 
  ShieldCheck, 
  User, 
  Building2,
  Sparkles,
  Award
} from "lucide-react";

export interface StudentCardData {
  first_name?: string;
  last_name?: string;
  identifier?: string;
  class_grade?: string;
  phone?: string;
  blood_group?: string;
  dob?: string;
  emergency_contact?: string;
  photo_url?: string | null;
  avatar_url?: string | null;
  qr_code?: string;
  address?: string;
}

export interface CardTemplateTheme {
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  org_name?: string;
  org_logo?: string | null;
  academic_year?: string;
  orientation?: "portrait" | "landscape";
  style_name?: string;
  show_signature?: boolean;
}

interface Card3DViewerProps {
  student?: StudentCardData;
  template?: CardTemplateTheme;
  initialSide?: "front" | "back";
  size?: "sm" | "md" | "lg" | "xl";
  showControls?: boolean;
  interactiveTilt?: boolean;
  className?: string;
}

export default function Card3DViewer({
  student = {},
  template = {},
  initialSide = "front",
  size = "md",
  showControls = true,
  interactiveTilt = true,
  className = ""
}: Card3DViewerProps) {
  const [isFlipped, setIsFlipped] = useState(initialSide === "back");
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync initial side if prop changes
  useEffect(() => {
    setIsFlipped(initialSide === "back");
  }, [initialSide]);

  // Orientation handling
  const isLandscape = template.orientation === "landscape";

  // Dimensions based on CR80 standards (ratio 1.585)
  const sizeMap = {
    sm: isLandscape ? "w-64 h-[162px]" : "w-44 h-70",
    md: isLandscape ? "w-80 h-[202px]" : "w-56 h-88",
    lg: isLandscape ? "w-96 h-[242px]" : "w-72 h-[456px]",
    xl: isLandscape ? "w-[440px] h-[277px]" : "w-84 h-[532px]"
  };

  const primaryColor = template.primary_color || "#1e3a8a"; // Default deep royal blue
  const secondaryColor = template.secondary_color || "#3b82f6";
  const orgName = template.org_name || "Madani International Academy";
  const academicYear = template.academic_year || "2026 - 2027";
  const fullName = [student.first_name, student.last_name].filter(Boolean).join(" ") || "Student Name";
  const identifier = student.identifier || "ID-2026-0000";
  const classGrade = student.class_grade || "Grade 1 - Section A";
  const bloodGroup = student.blood_group || "O+";
  const photoUrl = student.photo_url || student.avatar_url;

  // 3D Tilt calculation
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactiveTilt || isFlipped) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rX = ((y - centerY) / centerY) * -12; // Max 12 deg tilt
    const rY = ((x - centerX) / centerX) * 14;  // Max 14 deg tilt
    setRotateX(rX);
    setRotateY(rY);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
  };

  const handleReset = () => {
    setRotateX(0);
    setRotateY(0);
    setZoom(1);
    setIsFlipped(false);
  };

  const handleFlip = () => {
    setIsFlipped((prev) => !prev);
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* 3D Scene Viewport */}
      <div 
        ref={containerRef}
        className={`relative flex items-center justify-center p-4 transition-all duration-300 perspective-1200 ${
          isFullscreen ? "fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md p-8" : ""
        }`}
        style={{ transform: `scale(${zoom})` }}
      >
        {/* The 3D Rotating Card Container */}
        <div
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={handleMouseLeave}
          className={`relative ${sizeMap[size]} cursor-grab active:cursor-grabbing transition-transform duration-500 transform-style-3d`}
          style={{
            transform: `rotateX(${rotateX}deg) rotateY(${isFlipped ? 180 + rotateY : rotateY}deg)`,
            transformStyle: "preserve-3d"
          }}
        >
          {/* ==================== FRONT FACE ==================== */}
          <div
            className={`absolute inset-0 w-full h-full rounded-2xl overflow-hidden pvc-edge-shadow bg-white flex flex-col justify-between backface-hidden transition-shadow duration-300 ${
              isHovered ? "pvc-edge-shadow-hover" : ""
            }`}
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden"
            }}
          >
            {/* Top Brand Banner */}
            <div 
              className="p-3 text-white flex items-center justify-between shrink-0 relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
              }}
            >
              {/* Subtle Guilloche/Circuit watermark */}
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px]" />
              
              <div className="flex items-center gap-2 relative z-10 min-w-0">
                {template.org_logo ? (
                  <img 
                    src={template.org_logo} 
                    alt="Logo" 
                    className="w-7 h-7 object-contain rounded bg-white/20 p-0.5 shrink-0" 
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center font-black text-xs text-white shrink-0 border border-white/30">
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="text-[11px] font-black tracking-tight uppercase leading-tight truncate">
                    {orgName}
                  </h4>
                  <p className="text-[9px] font-medium opacity-85 leading-none">
                    Identity Pass • {academicYear}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 relative z-10">
                <ShieldCheck className="w-4 h-4 text-white/80" />
              </div>
            </div>

            {/* Middle Section: Photo & Core Data */}
            <div className="p-3 flex-1 flex flex-col items-center justify-center gap-2 relative">
              {/* Photo Frame with subtle 3D bevel */}
              <div className="relative group">
                <div 
                  className="w-20 h-24 rounded-xl overflow-hidden bg-slate-100 border-2 shadow-sm flex items-center justify-center shrink-0"
                  style={{ borderColor: primaryColor }}
                >
                  {photoUrl ? (
                    <img 
                      src={photoUrl} 
                      alt={fullName} 
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                      <User className="w-8 h-8 mb-1 text-slate-300" />
                      <span className="text-[8px] font-semibold leading-tight text-slate-400">
                        PHOTO REQ
                      </span>
                    </div>
                  )}
                </div>

                {/* Micro Anti-Counterfeit Hologram Tag */}
                <div 
                  className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow-md text-white text-[8px] font-black border border-white"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b, #ec4899, #6366f1)"
                  }}
                  title="Anti-Counterfeit Holographic Verification"
                >
                  <Award className="w-3 h-3 text-white" />
                </div>
              </div>

              {/* Student Demographics */}
              <div className="text-center w-full min-w-0 mt-0.5 space-y-0.5">
                <h3 className="text-xs font-black text-slate-900 tracking-tight truncate leading-tight uppercase">
                  {fullName}
                </h3>
                <div className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold tracking-tight">
                  {classGrade}
                </div>
              </div>

              {/* Key Metadata Grid */}
              <div className="w-full grid grid-cols-2 gap-1.5 pt-1 text-[9px] border-t border-slate-100 mt-1">
                <div className="bg-slate-50/80 p-1.5 rounded-lg border border-slate-100 text-left">
                  <span className="text-[8px] text-slate-400 block font-semibold uppercase leading-none">
                    Roll / ID
                  </span>
                  <span className="font-mono font-bold text-slate-800 text-[10px] truncate block mt-0.5">
                    {identifier}
                  </span>
                </div>
                <div className="bg-slate-50/80 p-1.5 rounded-lg border border-slate-100 text-left">
                  <span className="text-[8px] text-slate-400 block font-semibold uppercase leading-none">
                    Blood Group
                  </span>
                  <span className="font-bold text-rose-600 text-[10px] truncate block mt-0.5">
                    {bloodGroup}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Bar: QR Verification & Barcode */}
            <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="p-1 bg-white rounded border border-slate-200">
                  <QrCode className="w-4 h-4 text-slate-800" />
                </div>
                <div className="leading-none">
                  <span className="text-[7px] text-slate-400 font-mono block">MADANI ID SECURE</span>
                  <span className="text-[8px] font-mono font-bold text-slate-700 tracking-wider">
                    {identifier.slice(-6)}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[7px] font-black uppercase tracking-wider text-emerald-600 block">
                  AUTHORIZED
                </span>
                <span className="text-[7px] text-slate-400 block">
                  VALID {academicYear}
                </span>
              </div>
            </div>

            {/* Specular Gloss Overlay */}
            <div className="absolute inset-0 pvc-sheen rounded-2xl opacity-40 pointer-events-none" />
          </div>

          {/* ==================== BACK FACE ==================== */}
          <div
            className={`absolute inset-0 w-full h-full rounded-2xl overflow-hidden pvc-edge-shadow bg-white flex flex-col justify-between rotate-y-180 backface-hidden transition-shadow duration-300 ${
              isHovered ? "pvc-edge-shadow-hover" : ""
            }`}
            style={{
              transform: "rotateY(180deg)",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden"
            }}
          >
            {/* Top Magnetic Stripe Simulation */}
            <div className="w-full h-7 bg-slate-900 mt-2 shrink-0 flex items-center px-4 justify-between">
              <span className="text-[7px] text-slate-500 font-mono tracking-widest uppercase">
                CR80 MAGNETIC STRIPE / RFID TRACK 1
              </span>
              <div className="w-2 h-2 rounded-full bg-emerald-500/70" />
            </div>

            {/* Body: Terms, Emergency & Signature */}
            <div className="p-3 flex-1 flex flex-col justify-between space-y-2 text-[9px] text-slate-600">
              {/* Institution Terms */}
              <div className="space-y-1 text-[8px] leading-tight text-slate-500">
                <p className="font-semibold text-slate-700">TERMS &amp; CONDITIONS</p>
                <p>
                  1. This card is property of {orgName}. Loss must be reported immediately.
                </p>
                <p>
                  2. Non-transferable. Must be presented on institutional premises and transit buses.
                </p>
              </div>

              {/* Emergency Contacts */}
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 space-y-1">
                <div className="flex justify-between items-center text-[8px]">
                  <span className="text-slate-400 uppercase font-semibold">Emergency Contact:</span>
                  <span className="font-bold text-slate-800">
                    {student.emergency_contact || student.phone || "+91 98765 43210"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[8px]">
                  <span className="text-slate-400 uppercase font-semibold">Date of Birth:</span>
                  <span className="font-mono text-slate-800">
                    {student.dob || "15-Aug-2012"}
                  </span>
                </div>
                {student.address && (
                  <div className="text-[8px] text-slate-500 truncate pt-0.5 border-t border-slate-200/60">
                    {student.address}
                  </div>
                )}
              </div>

              {/* Signature Line & Barcode */}
              <div className="pt-1 flex items-end justify-between border-t border-slate-100">
                <div className="flex flex-col items-center">
                  {/* Simulated cursive signature */}
                  <div className="h-5 flex items-center justify-center font-serif italic text-slate-700 text-[10px] tracking-widest border-b border-slate-400 px-3">
                    Principal
                  </div>
                  <span className="text-[7px] text-slate-400 uppercase font-semibold mt-0.5">
                    Authorized Signatory
                  </span>
                </div>

                {/* Simulated Barcode */}
                <div className="flex flex-col items-end">
                  <div className="h-5 flex items-center gap-[2px] bg-white p-1 rounded">
                    <div className="w-[1.5px] h-full bg-slate-900" />
                    <div className="w-[1px] h-full bg-slate-900" />
                    <div className="w-[2px] h-full bg-slate-900" />
                    <div className="w-[1px] h-full bg-slate-900" />
                    <div className="w-[3px] h-full bg-slate-900" />
                    <div className="w-[1px] h-full bg-slate-900" />
                    <div className="w-[2px] h-full bg-slate-900" />
                    <div className="w-[1.5px] h-full bg-slate-900" />
                    <div className="w-[1px] h-full bg-slate-900" />
                    <div className="w-[2px] h-full bg-slate-900" />
                  </div>
                  <span className="font-mono text-[7px] text-slate-400">
                    *{identifier}*
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Branding Tag */}
            <div 
              className="px-3 py-1 text-white text-[8px] flex items-center justify-between shrink-0"
              style={{ background: primaryColor }}
            >
              <span className="font-semibold truncate max-w-[180px]">{orgName}</span>
              <span className="font-mono text-[7px] opacity-80">VERIFIED CR80 PVC</span>
            </div>

            {/* Specular Gloss Overlay */}
            <div className="absolute inset-0 pvc-sheen rounded-2xl opacity-40 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Interactive Controls Bar */}
      {showControls && (
        <div className="mt-3 flex items-center gap-1.5 bg-white border border-slate-200/90 rounded-full px-3 py-1 shadow-sm text-xs">
          {/* Flip Toggle Button */}
          <button
            type="button"
            onClick={handleFlip}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-semibold transition-all cursor-pointer"
            title="Flip between Front and Back (Space / Click)"
          >
            <RotateCw className="w-3.5 h-3.5 text-emerald-700" />
            <span className="text-[11px]">{isFlipped ? "Show Front" : "Flip to Back"}</span>
          </button>

          <span className="w-px h-3.5 bg-slate-200" />

          {/* Reset Tilt */}
          <button
            type="button"
            onClick={handleReset}
            className="p-1 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer"
            title="Reset Angle & Zoom"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={() => setZoom((prev) => Math.min(prev + 0.15, 1.6))}
            className="p-1 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {/* Zoom Out */}
          <button
            type="button"
            onClick={() => setZoom((prev) => Math.max(prev - 0.15, 0.7))}
            className="p-1 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Preview Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="p-1 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen 3D Inspection"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5 text-rose-500" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
