"use client";

import { useEffect, useState } from "react";
import { api, Member, ClassItem } from "@/lib/api";
import Card3DViewer from "@/components/id-card/Card3DViewer";
import { 
  Sparkles, 
  Users, 
  GraduationCap, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Camera, 
  RotateCw, 
  Maximize2, 
  Layers, 
  ShieldCheck, 
  Filter, 
  X,
  FileCheck2,
  Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ClassWiseStudentIDShowcasePage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [org, setOrg] = useState<any>(null);
  const [selectedClass, setSelectedClass] = useState<string>("ALL");
  const [readinessFilter, setReadinessFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [inspectedMember, setInspectedMember] = useState<Member | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [orgData, memberList] = await Promise.all([
        api.getMyOrganization().catch(() => null),
        api.getMembers({})
      ]);

      setOrg(orgData);
      const mList = Array.isArray(memberList) ? memberList : memberList?.results || [];
      setMembers(mList);

      if (orgData?.id) {
        const clsList = await api.getClasses(orgData.id).catch(() => []);
        setClasses(clsList);
      }
    } catch (err) {
      console.error("Failed to load showcase data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Derive unique class names from members if classes list is empty
  const availableClassNames = classes.length > 0
    ? classes.map(c => `${c.name}${c.section ? ` - ${c.section}` : ""}`)
    : Array.from(new Set(members.map(m => m.class_grade || m.class_name).filter(Boolean))) as string[];

  // Filter members
  const filtered = members.filter(m => {
    const studentClass = m.class_grade || m.class_name || "Unassigned";
    const matchesClass = selectedClass === "ALL" || studentClass === selectedClass;
    
    const fullName = `${m.first_name} ${m.last_name || ""}`.toLowerCase();
    const idStr = (m.identifier || m.roll_number || "").toLowerCase();
    const matchesSearch = !search || fullName.includes(search.toLowerCase()) || idStr.includes(search.toLowerCase());

    const isReady = !!(m.first_name && (m.identifier || m.roll_number) && (m.photo_url || m.avatar_url));
    const matchesReadiness = readinessFilter === "ALL" 
      ? true 
      : readinessFilter === "READY" 
      ? isReady 
      : !isReady;

    return matchesClass && matchesSearch && matchesReadiness;
  });

  // Overall statistics
  const totalStudents = members.length;
  const completedRecords = members.filter(m => m.first_name && (m.identifier || m.roll_number) && (m.photo_url || m.avatar_url)).length;
  const readyForReview = members.filter(m => m.status === "SUBMITTED" || m.status === "APPROVED").length;
  const needingCorrections = members.filter(m => m.status === "CHANGES_REQUESTED").length;

  // Selected Class Statistics
  const classMembers = selectedClass === "ALL" 
    ? members 
    : members.filter(m => (m.class_grade || m.class_name) === selectedClass);
  const classTotal = classMembers.length;
  const classComplete = classMembers.filter(m => m.first_name && (m.identifier || m.roll_number) && (m.photo_url || m.avatar_url)).length;
  const classMissingPhotos = classMembers.filter(m => !(m.photo_url || m.avatar_url)).length;
  const classMissingFields = classMembers.filter(m => !m.first_name || !(m.identifier || m.roll_number)).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-8 h-8 border-2 border-[#15803D] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
          Rendering 3D Student ID Showcase...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Banner: Institution & Template Context */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[#15803D]">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  {org?.name || "Institution"} Student ID Showcase
                </h1>
                <Badge variant="purple" className="bg-emerald-50 text-[#15803D] border-emerald-200 text-[10px] font-bold">
                  Academic Year 2026 - 2027
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Live 3D PVC cards generated dynamically using the approved institutional design template.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="success" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs font-bold px-3 py-1">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Template: Approved v2.1
            </Badge>
          </div>
        </div>

        {/* Global Statistics Counter */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Students</span>
            <span className="text-base font-black text-slate-900">{totalStudents}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completed Data</span>
            <span className="text-base font-black text-emerald-700">{completedRecords}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ready for Batch</span>
            <span className="text-base font-black text-[#15803D]">{readyForReview}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Needs Correction</span>
            <span className="text-base font-black text-rose-600">{needingCorrections}</span>
          </div>
        </div>
      </div>

      {/* Class Selector Tabs & Filters */}
      <div className="space-y-4">
        {/* Class Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedClass("ALL")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedClass === "ALL"
                ? "bg-[#15803D] text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            All Classes ({totalStudents})
          </button>
          {availableClassNames.map((cName) => {
            const count = members.filter(m => (m.class_grade || m.class_name) === cName).length;
            return (
              <button
                key={cName}
                onClick={() => setSelectedClass(cName)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedClass === cName
                    ? "bg-[#15803D] text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {cName} ({count})
              </button>
            );
          })}
        </div>

        {/* Selected Cohort Metrics & Search Toolbar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs font-medium text-slate-600 flex-wrap">
            <span className="font-bold text-slate-900">
              {selectedClass === "ALL" ? "All Cohorts" : selectedClass}:
            </span>
            <span>Total: <strong className="text-slate-900">{classTotal}</strong></span>
            <span>•</span>
            <span className="text-emerald-700">Complete: <strong>{classComplete}</strong></span>
            <span>•</span>
            <span className="text-amber-700">Missing Photos: <strong>{classMissingPhotos}</strong></span>
            <span>•</span>
            <span className="text-rose-600">Missing Fields: <strong>{classMissingFields}</strong></span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* Readiness Filter */}
            <select
              value={readinessFilter}
              onChange={(e) => setReadinessFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold"
            >
              <option value="ALL">All Readiness</option>
              <option value="READY">Ready for Print (100%)</option>
              <option value="INCOMPLETE">Missing Photo/Fields</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3D Student ID Card Gallery Grid */}
      {filtered.length === 0 ? (
        <div className="p-16 text-center bg-white border border-slate-200 rounded-2xl shadow-xs">
          <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No Student Records Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            No students match the selected class or search filter. Class staff can enter student records in their portal.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 items-start">
          {filtered.map((m) => {
            const isComplete = !!(m.first_name && (m.identifier || m.roll_number) && (m.photo_url || m.avatar_url));
            const fullName = `${m.first_name} ${m.last_name || ""}`;

            return (
              <div
                key={m.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                {/* Card Header & Status */}
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                  <div className="min-w-0 pr-2">
                    <h4 className="text-xs font-black text-slate-900 truncate">{fullName}</h4>
                    <span className="text-[10px] font-mono text-slate-500 block truncate">
                      {m.identifier || m.roll_number || "NO-ID"}
                    </span>
                  </div>
                  <Badge 
                    variant={isComplete ? "success" : "secondary"}
                    className="text-[9px] font-bold shrink-0"
                  >
                    {isComplete ? "Ready" : "Incomplete"}
                  </Badge>
                </div>

                {/* 3D ID Card Interactive Frame */}
                <div className="py-2 flex items-center justify-center bg-slate-50/60 rounded-xl border border-slate-100">
                  <Card3DViewer
                    student={{
                      first_name: m.first_name,
                      last_name: m.last_name,
                      identifier: m.identifier || m.roll_number,
                      class_grade: m.class_grade || m.class_name,
                      blood_group: m.blood_group,
                      dob: m.dob,
                      emergency_contact: m.emergency_contact || m.phone,
                      photo_url: m.photo_url || m.avatar_url
                    }}
                    template={{
                      primary_color: "#1e3a8a",
                      secondary_color: "#3b82f6",
                      org_name: org?.name || "Madani International",
                      academic_year: "2026 - 2027",
                      orientation: "portrait"
                    }}
                    size="sm"
                    showControls={true}
                    interactiveTilt={true}
                  />
                </div>

                {/* Card Action Footer */}
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">
                    {m.class_grade || m.class_name || "Cohort"}
                  </span>
                  <button
                    onClick={() => setInspectedMember(m)}
                    className="text-xs font-bold text-[#15803D] hover:text-[#14532D] flex items-center gap-1 cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5" /> Full Inspect
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full-Screen 3D Inspection Modal */}
      {inspectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in-50 zoom-in-95">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  {inspectedMember.first_name} {inspectedMember.last_name}
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  Roll: {inspectedMember.identifier || inspectedMember.roll_number} • {inspectedMember.class_grade || "Class"}
                </p>
              </div>
              <button
                onClick={() => setInspectedMember(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 flex items-center justify-center">
              <Card3DViewer
                student={{
                  first_name: inspectedMember.first_name,
                  last_name: inspectedMember.last_name,
                  identifier: inspectedMember.identifier || inspectedMember.roll_number,
                  class_grade: inspectedMember.class_grade,
                  blood_group: inspectedMember.blood_group,
                  dob: inspectedMember.dob,
                  emergency_contact: inspectedMember.emergency_contact || inspectedMember.phone,
                  photo_url: inspectedMember.photo_url || inspectedMember.avatar_url
                }}
                template={{
                  primary_color: "#1e3a8a",
                  secondary_color: "#3b82f6",
                  org_name: org?.name || "Madani International",
                  academic_year: "2026 - 2027",
                  orientation: "portrait"
                }}
                size="md"
                showControls={true}
                interactiveTilt={true}
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-700">Admission / Identifier:</span>
                <span className="font-mono text-slate-900 font-bold">{inspectedMember.identifier || inspectedMember.roll_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-700">Class &amp; Section:</span>
                <span className="text-slate-900">{inspectedMember.class_grade || inspectedMember.class_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-700">Emergency Phone:</span>
                <span className="text-slate-900">{inspectedMember.emergency_contact || inspectedMember.phone || "None on file"}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInspectedMember(null)}
                className="text-xs text-slate-700 border-slate-200"
              >
                Close Showcase
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
