"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { 
  Users, 
  Plus, 
  FileSpreadsheet, 
  FolderArchive, 
  Search, 
  Filter, 
  Camera, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  Edit3, 
  Trash2, 
  Eye, 
  Check, 
  X, 
  RotateCcw, 
  UploadCloud,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// Local sub-component for HTML5 Camera & Cropping
function PhotoCaptureCropper({
  onPhotoSelected,
  onCancel,
  currentPhotoUrl
}: {
  onPhotoSelected: (file: File) => void;
  onCancel: () => void;
  currentPhotoUrl?: string;
}) {
  const [mode, setMode] = useState<"none" | "upload" | "camera" | "edit">("none");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  // Cropper configs
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setMode("camera");
    } catch (err) {
      alert("Could not access camera. Please check browser permissions.");
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  useEffect(() => {
    if (mode === "camera") {
      startCamera();
    }
  }, [facingMode]);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      setCapturedImage(canvas.toDataURL("image/jpeg"));
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      setMode("edit");
      setZoom(1);
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
      setOffset({ x: 0, y: 0 });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCapturedImage(reader.result as string);
        setMode("edit");
        setZoom(1);
        setRotation(0);
        setFlipH(false);
        setFlipV(false);
        setOffset({ x: 0, y: 0 });
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (mode !== "edit" || !capturedImage || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = capturedImage;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      
      ctx.translate(cx + offset.x, cy + offset.y);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      
      const baseScale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const w = img.width * baseScale * zoom;
      const h = img.height * baseScale * zoom;
      
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();

      // Semitransparent border mask (CR80 ratio or 1:1 circle shape)
      ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
      ctx.beginPath();
      ctx.rect(0, 0, canvas.width, canvas.height);
      
      const r = Math.min(canvas.width, canvas.height) * 0.4;
      ctx.arc(cx, cy, r, 0, Math.PI * 2, true);
      ctx.fill();

      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    };
  }, [mode, capturedImage, zoom, rotation, flipH, flipV, offset]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleUsePhoto = () => {
    if (!canvasRef.current || !capturedImage) return;
    const canvas = canvasRef.current;
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = 400;
    outputCanvas.height = 400;
    const ctx = outputCanvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = capturedImage;
    img.onload = () => {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const r = Math.min(canvas.width, canvas.height) * 0.4;

      ctx.save();
      ctx.translate(200, 200);
      const scaleFactor = 200 / r;
      
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      
      const baseScale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const w = img.width * baseScale * zoom * scaleFactor;
      const h = img.height * baseScale * zoom * scaleFactor;
      
      ctx.drawImage(
        img, 
        (-w / 2) + (offset.x * scaleFactor), 
        (-h / 2) + (offset.y * scaleFactor), 
        w, 
        h
      );
      ctx.restore();

      outputCanvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "student_photo.jpg", { type: "image/jpeg" });
          onPhotoSelected(file);
          setMode("none");
        }
      }, "image/jpeg", 0.9);
    };
  };

  return (
    <div className="space-y-4">
      {mode === "none" && (
        <div className="flex flex-col items-center justify-center p-6 border border-dashed border-slate-200 rounded-xl bg-slate-50">
          {currentPhotoUrl ? (
            <img src={currentPhotoUrl} className="w-24 h-24 rounded-full border-2 border-amber-500/30 object-cover mb-4 shadow" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-white border border-slate-200 flex items-center justify-center text-2xl text-slate-500 mb-4">👤</div>
          )}
          <div className="flex flex-wrap gap-2.5 justify-center">
            <button
              type="button"
              onClick={() => setMode("upload")}
              className="px-4 py-2 bg-white hover:bg-slate-800 border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-all"
            >
              Upload Photo
            </button>
            <button
              type="button"
              onClick={() => {
                setFacingMode("user");
                setMode("camera");
                startCamera();
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm text-xs font-bold rounded-lg transition-all shadow"
            >
              Use Camera
            </button>
          </div>
        </div>
      )}

      {mode === "upload" && (
        <div className="p-5 border border-slate-200 rounded-xl bg-slate-50 text-center">
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileUpload} 
            className="text-xs text-slate-500 block w-full mb-3 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-500/10 file:text-indigo-600 hover:file:bg-amber-500/20" 
          />
          <button
            type="button"
            onClick={() => setMode("none")}
            className="text-xs text-slate-500 underline"
          >
            Back
          </button>
        </div>
      )}

      {mode === "camera" && (
        <div className="flex flex-col items-center p-4 border border-slate-200 rounded-xl bg-slate-50">
          <div className="relative w-full aspect-video max-w-sm rounded-lg overflow-hidden bg-black border border-slate-200">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          </div>
          <div className="flex gap-3 mt-4 w-full justify-center">
            <button
              type="button"
              onClick={capturePhoto}
              className="px-5 py-2.5 bg-amber-505 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-all"
            >
              Capture Frame
            </button>
            <button
              type="button"
              onClick={toggleCamera}
              className="px-3.5 py-2.5 bg-white border border-slate-200 text-slate-600 text-xs font-medium rounded-lg"
            >
              🔄 Flip Camera
            </button>
            <button
              type="button"
              onClick={() => {
                if (stream) stream.getTracks().forEach(t => t.stop());
                setMode("none");
              }}
              className="px-3.5 py-2.5 bg-slate-800 text-slate-500 text-xs font-medium rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === "edit" && capturedImage && (
        <div className="flex flex-col items-center p-4 border border-slate-200 rounded-xl bg-slate-50">
          <div className="text-xs text-slate-500 mb-2 font-medium">Drag to pan, use slider to scale</div>
          
          <canvas
            ref={canvasRef}
            width={280}
            height={280}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="border border-slate-200 rounded-lg bg-white cursor-move"
          />

          <div className="w-full max-w-xs mt-4 space-y-4">
            <div>
              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                <span>Zoom Scale</span>
                <span>{Math.round(zoom * 100)}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            <div className="grid grid-cols-4 gap-1.5 text-center">
              <button
                type="button"
                onClick={() => setRotation(r => (r + 90) % 360)}
                className="py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-semibold rounded hover:text-slate-900"
              >
                Rotate 🔄
              </button>
              <button
                type="button"
                onClick={() => setFlipH(f => !f)}
                className="py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-semibold rounded hover:text-slate-900"
              >
                Flip H ↔️
              </button>
              <button
                type="button"
                onClick={() => setFlipV(f => !f)}
                className="py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-semibold rounded hover:text-slate-900"
              >
                Flip V ↕️
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setRotation(0);
                  setFlipH(false);
                  setFlipV(false);
                  setOffset({ x: 0, y: 0 });
                }}
                className="py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-semibold rounded hover:text-slate-900"
              >
                Reset ↩️
              </button>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleUsePhoto}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-bold rounded-lg text-xs"
              >
                Use Photo ✓
              </button>
              <button
                type="button"
                onClick={() => setMode("none")}
                className="px-4 py-2 bg-slate-800 text-slate-500 text-xs font-semibold rounded-lg"
              >
                Retake
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudentsPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Tab/Workflow selection
  const [activeTab, setActiveTab] = useState<string>("APPROVED");

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [photoFilter, setPhotoFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });

  // Modal Visibility states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showZipModal, setShowZipModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  // Review Dialog Details Modal
  const [reviewMember, setReviewMember] = useState<any>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectMemberId, setRejectMemberId] = useState<string | null>(null);

  // Bulk Report feedback logs
  const [importSummary, setImportSummary] = useState<any>(null);
  const [zipSummary, setZipSummary] = useState<any>(null);

  // Form State for Manual Add/Edit
  const [memberForm, setMemberForm] = useState({
    member_id: "",
    admission_number: "",
    name: "",
    dob: "",
    gender: "Male",
    blood_group: "O+",
    department_id: "",
    designation: "",
    class_name: "",
    section: "",
    academic_year: "",
    roll_number: "",
    phone: "",
    email: "",
    address: "",
    parent_name: "",
    emergency_contact: "",
    joining_date: "",
    expiry_date: "",
    status: "DRAFT"
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [formError, setFormError] = useState("");

  const excelInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getMe()
      .then(u => setCurrentUser(u))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchData();
  }, [search, deptFilter, photoFilter, page, activeTab]);

  const isAdmin = currentUser?.roles?.some((r: string) => 
    ["SUPER_ADMIN", "ORGANIZATION_ADMIN", "STAFF_ADMIN"].includes(r)
  ) || false;

  const fetchData = async () => {
    setLoading(true);
    try {
      const depts = await api.getDepartments();
      setDepartments(depts);

      // Fetch list based on active workflow tab
      const res = await api.getMembers({
        page,
        limit: 10,
        search: search || undefined,
        department_id: deptFilter || undefined,
        status: activeTab,
        has_photo: photoFilter === "yes" ? true : photoFilter === "no" ? false : undefined
      });
      setMembers(res.results);
      setTotalPages(res.pages);
      setTotalCount(res.total);

      // Load counts for top stats summary
      const approvedList = await api.getMembers({ limit: 1, status: "APPROVED" });
      const pendingList = await api.getMembers({ limit: 1, status: "PENDING" });
      const draftList = await api.getMembers({ limit: 1, status: "DRAFT" });
      const rejectedList = await api.getMembers({ limit: 1, status: "REJECTED" });
      
      setStats({
        total: approvedList.total + pendingList.total + draftList.total + rejectedList.total,
        pending: pendingList.total,
        approved: approvedList.total,
        rejected: rejectedList.total
      });
    } catch (err) {
      console.error("Failed to load students", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e: any) => {
    setMemberForm({
      ...memberForm,
      [e.target.name]: e.target.value
    });
  };

  const handleOpenAdd = () => {
    setSelectedMember(null);
    setFormError("");
    setPhotoFile(null);
    setMemberForm({
      member_id: "",
      admission_number: "",
      name: "",
      dob: "",
      gender: "Male",
      blood_group: "O+",
      department_id: departments[0]?.id || "",
      designation: "",
      class_name: "",
      section: "",
      academic_year: "",
      roll_number: "",
      phone: "",
      email: "",
      address: "",
      parent_name: "",
      emergency_contact: "",
      joining_date: "",
      expiry_date: "",
      status: "DRAFT"
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (member: any) => {
    setSelectedMember(member);
    setFormError("");
    setPhotoFile(null);
    setMemberForm({
      member_id: member.member_id,
      admission_number: member.admission_number || "",
      name: member.name,
      dob: member.dob || "",
      gender: member.gender || "Male",
      blood_group: member.blood_group || "O+",
      department_id: member.department?.id || "",
      designation: member.designation || "",
      class_name: member.class_name || "",
      section: member.section || "",
      academic_year: member.academic_year || "",
      roll_number: member.roll_number || "",
      phone: member.phone || "",
      email: member.email || "",
      address: member.address || "",
      parent_name: member.parent_name || "",
      emergency_contact: member.emergency_contact || "",
      joining_date: member.joining_date || "",
      expiry_date: member.expiry_date || "",
      status: member.status || "DRAFT"
    });
    setShowAddModal(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      const payload = { ...memberForm };
      Object.keys(payload).forEach((key) => {
        if ((payload as any)[key] === "") {
          (payload as any)[key] = null;
        }
      });

      let savedMember;
      if (selectedMember) {
        savedMember = await api.updateMember(selectedMember.id, payload);
      } else {
        savedMember = await api.createMember(payload);
      }

      if (photoFile && savedMember) {
        await api.uploadMemberPhoto(savedMember.id, photoFile);
      }

      setShowAddModal(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || "Conflict occurred. Duplicate Student ID not allowed.");
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (confirm("Are you sure you want to soft-delete this student record?")) {
      try {
        await api.deleteMember(id);
        fetchData();
      } catch (err) {
        alert("Failed to delete record.");
      }
    }
  };

  // Submission Flow
  const handleSubmitReview = async (id: string) => {
    try {
      await api.submitMember(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to submit member for review.");
    }
  };

  const handleApprove = async (id: string) => {
    if (confirm("Yes, I have verified all information. Approve this student?")) {
      try {
        await api.approveMember(id);
        setReviewMember(null);
        fetchData();
      } catch (err: any) {
        alert(err.message || "Failed to approve student profile.");
      }
    }
  };

  const handleOpenReject = (id: string) => {
    setRejectMemberId(id);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectMemberId) return;
    if (!rejectReason.trim()) {
      alert("Please specify a rejection reason.");
      return;
    }
    try {
      await api.rejectMember(rejectMemberId, rejectReason);
      setShowRejectModal(false);
      setReviewMember(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to reject student profile.");
    }
  };

  // Bulk Excel import handler
  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setImportSummary(null);
    try {
      const report = await api.importMembers(file);
      setImportSummary(report);
      setShowImportModal(true);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to process Excel spreadsheet.");
    } finally {
      setLoading(false);
      if (excelInputRef.current) excelInputRef.current.value = "";
    }
  };

  // Bulk ZIP photos handler
  const handleZipImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setZipSummary(null);
    try {
      const report = await api.importPhotosZip(file);
      setZipSummary(report);
      setShowZipModal(true);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to process ZIP photo archives.");
    } finally {
      setLoading(false);
      if (zipInputRef.current) zipInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Students Directory</h1>
          <p className="text-slate-500 text-sm">Manage student profiles, live capture photo frames, and review approval queues.</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button 
            onClick={handleOpenAdd}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-bold text-xs"
            size="sm"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Student
          </Button>
          
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-800 text-slate-800 font-semibold rounded-lg text-xs transition-all cursor-pointer">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Import Excel</span>
            <input 
              type="file" 
              ref={excelInputRef} 
              accept=".csv,.xlsx" 
              className="hidden" 
              onChange={handleExcelImport} 
            />
          </label>

          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-800 text-slate-800 font-semibold rounded-lg text-xs transition-all cursor-pointer">
            <FolderArchive className="w-3.5 h-3.5 text-indigo-600" />
            <span>Upload Photos ZIP</span>
            <input 
              type="file" 
              ref={zipInputRef} 
              accept=".zip" 
              className="hidden" 
              onChange={handleZipImport} 
            />
          </label>
        </div>
      </div>

      {/* Top Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl">
          <div className="text-xs text-slate-500 uppercase font-semibold">Total Students</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats.total}</div>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl border-l-amber-500/40 border-l-2">
          <div className="text-xs text-indigo-600 uppercase font-semibold">Pending Approval</div>
          <div className="text-2xl font-extrabold text-indigo-600 mt-1">{stats.pending}</div>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl border-l-green-500/40 border-l-2">
          <div className="text-xs text-green-500 uppercase font-semibold">Approved Directory</div>
          <div className="text-2xl font-extrabold text-green-400 mt-1">{stats.approved}</div>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl border-l-red-500/40 border-l-2">
          <div className="text-xs text-red-500 uppercase font-semibold">Rejected Drafts</div>
          <div className="text-2xl font-extrabold text-red-400 mt-1">{stats.rejected}</div>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: "APPROVED", label: "Directory (Approved)" },
          { id: "PENDING", label: "Pending Reviews" },
          { id: "DRAFT", label: "Staged Drafts" },
          { id: "REJECTED", label: "Rejected Drafts" }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => {
              setActiveTab(t.id);
              setPage(1);
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeTab === t.id
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-500 hover:text-slate-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filter Row */}
      <div className="grid md:grid-cols-3 gap-4 bg-white p-4 border border-slate-200 rounded-xl">
        <input 
          type="text" 
          placeholder="Search by name, ID or phone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        />

        <select 
          value={deptFilter}
          onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        <select 
          value={photoFilter}
          onChange={(e) => { setPhotoFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">All Photo States</option>
          <option value="yes">With Photo Available</option>
          <option value="no">Photo Missing</option>
        </select>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="p-12 text-center text-slate-500">Loading student directory...</div>
      ) : members.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl space-y-3">
          <Users className="w-10 h-10 mx-auto text-slate-600 mb-2" />
          <h4 className="font-bold text-slate-900 text-sm">No student records found</h4>
          <p className="text-slate-500 text-xs max-w-sm mx-auto">Create profiles manually, import spreadsheets, or check another tab.</p>
          <Button 
            onClick={handleOpenAdd} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-bold text-xs mt-2"
            size="sm"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Student Profile
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-white border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="p-4">Photo</th>
                  <th className="p-4">Student ID</th>
                  <th className="p-4">Name</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Class</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 bg-white/10">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-white">
                    <td className="p-4">
                      {m.photo_url ? (
                        <img 
                          src={`${api.baseUrl || "http://localhost:8000"}${m.photo_url}`} 
                          alt={m.name} 
                          className="w-10 h-12 rounded object-cover border border-slate-200 shadow-sm"
                        />
                      ) : (
                        <div className="w-10 h-12 rounded bg-slate-50 flex items-center justify-center text-[10px] text-slate-500 border border-slate-200">
                          Missing
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-mono text-xs text-indigo-600">{m.member_id}</td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-900">{m.name}</div>
                      {m.rejection_reason && activeTab === "REJECTED" && (
                        <div className="text-[10px] text-red-400 mt-0.5">Reason: {m.rejection_reason}</div>
                      )}
                    </td>
                    <td className="p-4 text-slate-300">{m.department?.name || "-"}</td>
                    <td className="p-4 text-slate-500">{m.class_name || "-"}</td>
                    <td className="p-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold border ${
                        m.status === "APPROVED" 
                          ? "bg-green-950/40 text-green-400 border-green-900/30" 
                          : m.status === "PENDING"
                          ? "bg-amber-950/40 text-indigo-600 border-amber-900/30"
                          : m.status === "REJECTED"
                          ? "bg-red-950/40 text-red-400 border-red-900/30"
                          : "bg-slate-50 text-slate-500 border-slate-900"
                      }`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {activeTab === "PENDING" && isAdmin ? (
                        <>
                          <button
                            onClick={() => setReviewMember(m)}
                            className="px-2.5 py-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm rounded transition shadow-sm"
                          >
                            Review / Approve
                          </button>
                        </>
                      ) : activeTab === "DRAFT" ? (
                        <>
                          <button
                            onClick={() => handleOpenEdit(m)}
                            className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-800 text-slate-800 rounded transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleSubmitReview(m.id)}
                            className="px-2.5 py-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm rounded transition shadow-sm"
                          >
                            Submit Review
                          </button>
                        </>
                      ) : activeTab === "REJECTED" ? (
                        <>
                          <button
                            onClick={() => handleOpenEdit(m)}
                            className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-800 text-slate-800 rounded transition"
                          >
                            Correct & Resubmit
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleOpenEdit(m)}
                            className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-850 text-slate-800 rounded transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteMember(m.id)}
                            className="px-2.5 py-1 text-xs font-semibold bg-white border border-red-950/20 hover:bg-red-950/40 text-red-400 rounded transition"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          <div className="flex items-center justify-between text-sm text-slate-500 px-4">
            <div>
              Showing {members.length} of {totalCount} records
            </div>
            <div className="flex gap-2">
              <button 
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 bg-white rounded border border-slate-200 hover:bg-slate-800 disabled:opacity-30"
              >
                Previous
              </button>
              <button 
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 bg-white rounded border border-slate-200 hover:bg-slate-800 disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Add/Edit Student Drawer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-xl bg-white border-l border-slate-200 p-8 overflow-y-auto flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedMember ? "Edit Student Profile" : "Add Student Profile"}
                </h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-900 text-xl">✕</button>
              </div>

              {formError && (
                <div className="p-3 mb-6 text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg">
                  ⚠️ {formError}
                </div>
              )}

              <form onSubmit={handleSaveMember} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Student ID *</label>
                    <input 
                      type="text" 
                      name="member_id"
                      required
                      value={memberForm.member_id}
                      onChange={handleFormChange}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded text-slate-800 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Admission Number</label>
                    <input 
                      type="text" 
                      name="admission_number"
                      value={memberForm.admission_number}
                      onChange={handleFormChange}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded text-slate-800 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Full Name *</label>
                    <input 
                      type="text" 
                      name="name"
                      required
                      value={memberForm.name}
                      onChange={handleFormChange}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded text-slate-800 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Date of Birth</label>
                    <input 
                      type="date" 
                      name="dob"
                      value={memberForm.dob}
                      onChange={handleFormChange}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded text-slate-800 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Gender</label>
                    <select 
                      name="gender"
                      value={memberForm.gender}
                      onChange={handleFormChange}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded text-slate-800 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                    >
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Class / Standard</label>
                    <input 
                      type="text" 
                      name="class_name"
                      value={memberForm.class_name}
                      onChange={handleFormChange}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded text-slate-800 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Academic Department</label>
                    <select 
                      name="department_id"
                      value={memberForm.department_id}
                      onChange={handleFormChange}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded text-slate-800 text-sm"
                    >
                      <option value="">None</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Contact Phone</label>
                    <input 
                      type="text" 
                      name="phone"
                      value={memberForm.phone}
                      onChange={handleFormChange}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded text-slate-800 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Blood Group</label>
                    <select 
                      name="blood_group"
                      value={memberForm.blood_group}
                      onChange={handleFormChange}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded text-slate-800 text-sm"
                    >
                      <option>O+</option>
                      <option>O-</option>
                      <option>A+</option>
                      <option>A-</option>
                      <option>B+</option>
                      <option>B-</option>
                      <option>AB+</option>
                      <option>AB-</option>
                    </select>
                  </div>
                </div>

                {/* Profile Photo selector with Live Camera & Cropping Canvas */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Student Photo</label>
                  <PhotoCaptureCropper 
                    currentPhotoUrl={selectedMember?.photo_url ? `${api.baseUrl || "http://localhost:8000"}${selectedMember.photo_url}` : undefined}
                    onPhotoSelected={(croppedFile) => setPhotoFile(croppedFile)}
                    onCancel={() => setPhotoFile(null)}
                  />
                  {photoFile && (
                    <div className="text-[11px] text-green-400 font-semibold mt-2 flex items-center gap-1.5 animate-pulse">
                      ✓ Cropped photo staged ({Math.round(photoFile.size / 1024)} KB)
                    </div>
                  )}
                </div>

                <div className="flex gap-4 pt-4 border-t border-slate-200">
                  <button 
                    type="submit" 
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-bold rounded-lg transition-all shadow"
                  >
                    {selectedMember ? "Update Profile" : "Save Student"}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowAddModal(false)}
                    className="px-6 py-3 bg-slate-800 hover:bg-slate-750 text-slate-900 rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 2. Review Details Modal */}
      {reviewMember && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-xl bg-white border border-slate-200 p-8 rounded-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900">Review Student Application</h3>
              <button onClick={() => setReviewMember(null)} className="text-slate-500 hover:text-slate-900">✕</button>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 mb-6">
              <div className="flex-shrink-0 flex justify-center">
                {reviewMember.photo_url ? (
                  <img 
                    src={`${api.baseUrl || "http://localhost:8000"}${reviewMember.photo_url}`} 
                    alt={reviewMember.name} 
                    className="w-32 h-40 rounded-lg object-cover border border-slate-200 shadow"
                  />
                ) : (
                  <div className="w-32 h-40 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-200">
                    No Photo
                  </div>
                )}
              </div>

              <div className="flex-grow space-y-2 text-sm">
                <div><span className="text-slate-500">Student Name:</span> <span className="font-bold text-slate-900">{reviewMember.name}</span></div>
                <div><span className="text-slate-500">Student ID:</span> <span className="font-mono text-indigo-600 font-semibold">{reviewMember.member_id}</span></div>
                <div><span className="text-slate-500">Admission Number:</span> <span className="text-slate-900">{reviewMember.admission_number || "-"}</span></div>
                <div><span className="text-slate-500">Department:</span> <span className="text-slate-300">{reviewMember.department?.name || "-"}</span></div>
                <div><span className="text-slate-500">Class:</span> <span className="text-slate-300">{reviewMember.class_name || "-"}</span></div>
                <div><span className="text-slate-500">Blood Group:</span> <span className="text-slate-300 font-bold">{reviewMember.blood_group || "-"}</span></div>
                <div><span className="text-slate-500">Phone:</span> <span className="text-slate-500">{reviewMember.phone || "-"}</span></div>
              </div>
            </div>

            <div className="p-3.5 bg-amber-950/20 border border-amber-900/30 text-amber-300 rounded-lg text-xs mb-6">
              💡 Please check student details and verify photo alignment before approving.
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleApprove(reviewMember.id)}
                className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-slate-950 font-bold rounded-lg text-sm transition-all shadow"
              >
                Approve Student ✓
              </button>
              <button
                onClick={() => handleOpenReject(reviewMember.id)}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-slate-900 font-bold rounded-lg text-sm transition-all shadow"
              >
                Reject Student ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Rejection Comments Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-white border border-slate-200 p-6 rounded-xl">
            <h3 className="text-md font-bold text-slate-900 mb-2">Provide Rejection Reason</h3>
            <p className="text-xs text-slate-500 mb-4">Explain why this student application is rejected (e.g. Photo unclear, incorrect name/ID).</p>
            
            <textarea
              required
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="E.g., The student photo is blurry, please capture a new one."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded text-slate-800 text-sm focus:border-red-500 focus:outline-none mb-4"
            />

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-500 text-xs font-semibold rounded-lg hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-slate-900 text-xs font-bold rounded-lg shadow-sm"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Excel Import Summary Modal */}
      {showImportModal && importSummary && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-lg bg-white border border-slate-200 p-8 rounded-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Bulk Import Report</h3>
            <p className="text-slate-500 text-xs mb-6">Summary log of the uploaded Excel/CSV file parsing run.</p>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="text-xs font-semibold text-slate-500 uppercase">Records Processed</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{importSummary.total_records}</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="text-xs font-semibold text-green-500 uppercase">Imported (Staged)</div>
                <div className="text-2xl font-bold text-green-400 mt-1">{importSummary.valid_count}</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="text-xs font-semibold text-indigo-600 uppercase">Duplicates Checked</div>
                <div className="text-2xl font-bold text-indigo-600 mt-1">{importSummary.duplicate_count}</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="text-xs font-semibold text-red-500 uppercase">Skipped Errors</div>
                <div className="text-2xl font-bold text-red-400 mt-1">{importSummary.error_count}</div>
              </div>
            </div>

            {importSummary.errors.length > 0 && (
              <div className="mb-6">
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Error Logs ({importSummary.errors.length})</label>
                <div className="max-h-40 overflow-y-auto bg-slate-50 p-4 border border-slate-200 rounded-lg space-y-1.5 font-mono text-[10px] text-red-400">
                  {importSummary.errors.map((err: string, i: number) => (
                    <div key={i}>{err}</div>
                  ))}
                </div>
              </div>
            )}

            <button 
              onClick={() => setShowImportModal(false)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-bold rounded-lg text-sm"
            >
              Close Report
            </button>
          </div>
        </div>
      )}

      {/* 5. ZIP Photos Import Summary Modal */}
      {showZipModal && zipSummary && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-lg bg-white border border-slate-200 p-8 rounded-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Bulk ZIP Photos Match Report</h3>
            <p className="text-slate-500 text-xs mb-6">Summary of auto-photo mappings based on file name identifiers.</p>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="text-[10px] font-semibold text-slate-500 uppercase">Photos Parsed</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{zipSummary.total_photos}</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="text-[10px] font-semibold text-green-500 uppercase">Matched</div>
                <div className="text-2xl font-bold text-green-400 mt-1">{zipSummary.matched_count}</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="text-[10px] font-semibold text-red-500 uppercase">Unmatched</div>
                <div className="text-2xl font-bold text-red-400 mt-1">{zipSummary.unmatched_count + zipSummary.invalid_count}</div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Processing Timeline</label>
              <div className="max-h-40 overflow-y-auto bg-slate-50 p-4 border border-slate-200 rounded-lg space-y-1.5 font-mono text-[10px] text-slate-600">
                {zipSummary.details.map((detail: string, i: number) => (
                  <div key={i} className={detail.startsWith("Matched") ? "text-green-400" : "text-slate-450"}>
                    {detail}
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={() => setShowZipModal(false)}
              className="w-full py-3 bg-amber-505 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm"
            >
              Close Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
