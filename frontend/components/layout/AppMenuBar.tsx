"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  ChevronRight, 
  Sparkles, 
  Search, 
  BookOpen, 
  HelpCircle, 
  Printer, 
  Maximize2, 
  Minimize2,
  RefreshCw,
  LogOut,
  Sliders,
  CheckCircle2,
  ChevronDown,
  Layers,
  Users,
  ShieldCheck,
  FolderOpen
} from "lucide-react";

interface AppMenuBarProps {
  portalTitle: string;
  roleBadge: string;
  user?: any;
  onLogout?: () => void;
}

export function AppMenuBar({ portalTitle, roleBadge, user, onLogout }: AppMenuBarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut listener (Ctrl+K, F1)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const input = document.getElementById("global-nav-search");
        if (input) input.focus();
      }
      if (e.key === "F1") {
        e.preventDefault();
        router.push("/organization/showcase");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Generate dynamic breadcrumb segments
  const pathSegments = pathname.split("/").filter(Boolean);
  const formattedCrumbs = pathSegments.map((seg, idx) => {
    const href = "/" + pathSegments.slice(0, idx + 1).join("/");
    const label = seg
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return { href, label };
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    if (pathname.startsWith("/organization")) {
      router.push(`/organization/students?search=${encodeURIComponent(searchQuery)}`);
    } else if (pathname.startsWith("/admin")) {
      router.push(`/admin/production?search=${encodeURIComponent(searchQuery)}`);
    } else {
      router.push(`/vendor/production?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs select-none">
      {/* Top Application Desktop Menu Bar */}
      <div className="hidden md:flex items-center justify-between px-6 py-1.5 border-b border-slate-100 bg-[#FAFAFA] text-[12px] font-medium text-slate-700">
        {/* Left Menu Items (File, Edit, View, Tools, Help) */}
        <div ref={dropdownRef} className="flex items-center gap-1">
          {/* File Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveDropdown(activeDropdown === "file" ? null : "file")}
              className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 font-semibold ${
                activeDropdown === "file" ? "bg-slate-200 text-slate-900" : "hover:bg-slate-200/70 text-slate-700"
              }`}
            >
              File <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
            {activeDropdown === "file" && (
              <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-1 text-xs">
                <Link
                  href="/organization/students"
                  onClick={() => setActiveDropdown(null)}
                  className="flex items-center gap-2 px-3.5 py-2 hover:bg-emerald-50 hover:text-[#15803D] text-slate-700 font-medium"
                >
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>New Student Intake</span>
                </Link>
                <Link
                  href="/organization/classes"
                  onClick={() => setActiveDropdown(null)}
                  className="flex items-center gap-2 px-3.5 py-2 hover:bg-emerald-50 hover:text-[#15803D] text-slate-700 font-medium"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
                  <span>Classes & Hierarchy</span>
                </Link>
                <Link
                  href="/organization/batch-review"
                  onClick={() => setActiveDropdown(null)}
                  className="flex items-center gap-2 px-3.5 py-2 hover:bg-emerald-50 hover:text-[#15803D] text-slate-700 font-medium"
                >
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span>Lock Batch for Production</span>
                </Link>
                <div className="my-1 border-t border-slate-100" />
                <button
                  onClick={() => {
                    setActiveDropdown(null);
                    window.location.reload();
                  }}
                  className="w-full text-left flex items-center gap-2 px-3.5 py-2 hover:bg-slate-100 text-slate-700 font-medium"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Reload Workspace</span>
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  onClick={() => {
                    setActiveDropdown(null);
                    if (onLogout) onLogout();
                  }}
                  className="w-full text-left flex items-center gap-2 px-3.5 py-2 hover:bg-rose-50 text-rose-600 font-medium"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>

          {/* View Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveDropdown(activeDropdown === "view" ? null : "view")}
              className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 font-semibold ${
                activeDropdown === "view" ? "bg-slate-200 text-slate-900" : "hover:bg-slate-200/70 text-slate-700"
              }`}
            >
              View <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
            {activeDropdown === "view" && (
              <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 text-xs">
                <Link
                  href="/organization/showcase"
                  onClick={() => setActiveDropdown(null)}
                  className="flex items-center justify-between px-3.5 py-2 hover:bg-emerald-50 hover:text-[#15803D] text-slate-700 font-medium"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#15803D]" />
                    <span>3D ID Showcase</span>
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-[#14532D] px-1.5 py-0.5 rounded font-mono font-bold">F1</span>
                </Link>
                <Link
                  href="/organization/students"
                  onClick={() => setActiveDropdown(null)}
                  className="flex items-center gap-2 px-3.5 py-2 hover:bg-emerald-50 hover:text-[#15803D] text-slate-700 font-medium"
                >
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>Student Records Grid</span>
                </Link>
                <div className="my-1 border-t border-slate-100" />
                <button
                  onClick={() => {
                    setActiveDropdown(null);
                    toggleFullscreen();
                  }}
                  className="w-full text-left flex items-center justify-between px-3.5 py-2 hover:bg-slate-100 text-slate-700 font-medium"
                >
                  <span className="flex items-center gap-2">
                    {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    <span>{isFullscreen ? "Exit Fullscreen" : "Toggle Fullscreen"}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">F11</span>
                </button>
              </div>
            )}
          </div>

          {/* Tools Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveDropdown(activeDropdown === "tools" ? null : "tools")}
              className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 font-semibold ${
                activeDropdown === "tools" ? "bg-slate-200 text-slate-900" : "hover:bg-slate-200/70 text-slate-700"
              }`}
            >
              Tools <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
            {activeDropdown === "tools" && (
              <div className="absolute left-0 top-full mt-1 w-60 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 text-xs">
                <Link
                  href="/organization/orders"
                  onClick={() => setActiveDropdown(null)}
                  className="flex items-center gap-2 px-3.5 py-2 hover:bg-emerald-50 hover:text-[#15803D] text-slate-700 font-medium"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>PVC Print Orders & Tracking</span>
                </Link>
                <Link
                  href="/organization/design-review"
                  onClick={() => setActiveDropdown(null)}
                  className="flex items-center gap-2 px-3.5 py-2 hover:bg-emerald-50 hover:text-[#15803D] text-slate-700 font-medium"
                >
                  <Sliders className="w-3.5 h-3.5 text-slate-500" />
                  <span>Design Approval & Proofing</span>
                </Link>
                <Link
                  href="/organization/settings"
                  onClick={() => setActiveDropdown(null)}
                  className="flex items-center gap-2 px-3.5 py-2 hover:bg-emerald-50 hover:text-[#15803D] text-slate-700 font-medium"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                  <span>Settings & Tenant Configuration</span>
                </Link>
              </div>
            )}
          </div>

          {/* Help Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveDropdown(activeDropdown === "help" ? null : "help")}
              className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 font-semibold ${
                activeDropdown === "help" ? "bg-slate-200 text-slate-900" : "hover:bg-slate-200/70 text-slate-700"
              }`}
            >
              Help <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
            {activeDropdown === "help" && (
              <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 text-xs">
                <div className="px-3.5 py-2 border-b border-slate-100">
                  <div className="font-bold text-slate-900">Madani ID Platform</div>
                  <div className="text-[11px] text-slate-500">v2.4 Enterprise Edition</div>
                </div>
                <div className="px-3.5 py-2 text-[11px] text-slate-600 leading-relaxed">
                  3D ID Showcase, 300 DPI Imposition Engine, and Multi-tenant Governance.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Status Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="w-2 h-2 rounded-full bg-[#15803D] animate-pulse" />
            <span className="font-semibold text-[11px] text-[#14532D]">All Systems Operational</span>
          </div>
          <span className="text-slate-300">|</span>
          <span className="font-mono text-[11px] text-slate-500">Madani Suite v2.4</span>
        </div>
      </div>

      {/* Main Header Row with Breadcrumbs, Search, 3D Shortcut, and User Info */}
      <div className="h-14 px-6 flex items-center justify-between gap-4">
        {/* Dynamic Breadcrumbs */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-[#14532D] uppercase tracking-wider font-mono shrink-0">
            {portalTitle}
          </span>
          {formattedCrumbs.length > 0 && (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          )}
          <nav className="flex items-center gap-1.5 overflow-hidden text-xs truncate">
            {formattedCrumbs.map((crumb, idx) => {
              const isLast = idx === formattedCrumbs.length - 1;
              return (
                <React.Fragment key={crumb.href}>
                  {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />}
                  {isLast ? (
                    <span className="font-bold text-[#15803D] truncate">{crumb.label}</span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="text-slate-600 hover:text-slate-900 font-medium transition-colors truncate"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        </div>

        {/* Global Search and Quick Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Quick Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative hidden lg:block">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="global-nav-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search records... (Ctrl+K)"
              className="w-56 pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </form>

          {/* 3D Showcase Instant Action Button */}
          <Link
            href="/organization/showcase"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[#14532D] hover:bg-emerald-100 text-xs font-bold transition-all shadow-2xs hover:shadow-xs"
            title="Launch Interactive 3D ID Card Showcase"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#15803D]" />
            <span className="hidden sm:inline">3D Showcase</span>
          </Link>

          {/* Role Pill */}
          <span className="hidden sm:inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
            {roleBadge}
          </span>
        </div>
      </div>
    </header>
  );
}
