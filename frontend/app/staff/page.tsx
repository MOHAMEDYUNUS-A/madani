"use client";

import { useEffect, useState, useRef } from "react";
import { api, Member } from "@/lib/api";
import Card3DViewer from "@/components/id-card/Card3DViewer";
import { 
  Users, 
  Plus, 
  Send, 
  Search, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  GraduationCap,
  Eye,
  Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function StaffDataEntryPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewingMember, setPreviewingMember] = useState<Member | null>(null);

  // Submitting Batch
  const [submittingBatch, setSubmittingBatch] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    identifier: "",
    class_grade: "",
    phone: "",
    blood_group: "",
    dob: "",
    emergency_contact: ""
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [me, memberList] = await Promise.all([
        api.getMe(),
        api.getMembers({})
      ]);
      setCurrentUser(me);
      setMembers(Array.isArray(memberList) ? memberList : memberList?.results || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load student records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = () => {
    setEditingMember(null);
    setFormData({
      first_name: "",
      last_name: "",
      identifier: "",
      class_grade: currentUser?.assigned_class || "",
      phone: "",
      blood_group: "",
      dob: "",
      emergency_contact: ""
    });
    setPhotoFile(null);
    setPhotoPreview(null);
    setError(null);
    setSuccess(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (m: Member) => {
    setEditingMember(m);
    setFormData({
      first_name: m.first_name || m.name || "",
      last_name: m.last_name || "",
      identifier: m.identifier || m.roll_number || m.admission_number || "",
      class_grade: m.class_grade || m.class_name || currentUser?.assigned_class || "",
      phone: m.phone || "",
      blood_group: m.blood_group || "",
      dob: m.dob || "",
      emergency_contact: m.emergency_contact || ""
    });
    setPhotoFile(null);
    setPhotoPreview(m.photo_url || null);
    setError(null);
    setSuccess(null);
    setModalOpen(true);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent, submitForReview = false) => {
    e.preventDefault();
    if (!formData.first_name.trim() || !formData.identifier.trim()) {
      setError("First name and student identifier (Roll No) are mandatory.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      let memberId: string;

      if (editingMember) {
        memberId = editingMember.id;
        await api.updateMember(memberId, {
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          identifier: formData.identifier.trim(),
          class_grade: formData.class_grade.trim() || currentUser?.assigned_class || undefined,
          phone: formData.phone.trim() || undefined,
          blood_group: formData.blood_group.trim() || undefined,
          dob: formData.dob.trim() || undefined,
          emergency_contact: formData.emergency_contact.trim() || undefined,
          status: submitForReview ? "SUBMITTED" : editingMember.status === "CHANGES_REQUESTED" ? "SUBMITTED" : editingMember.status
        });
      } else {
        const created = await api.createMember({
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          identifier: formData.identifier.trim(),
          class_grade: formData.class_grade.trim() || currentUser?.assigned_class || undefined,
          phone: formData.phone.trim() || undefined,
          blood_group: formData.blood_group.trim() || undefined,
          dob: formData.dob.trim() || undefined,
          emergency_contact: formData.emergency_contact.trim() || undefined,
          status: submitForReview ? "SUBMITTED" : "DRAFT"
        });
        memberId = created.id;
      }

      if (photoFile) {
        await api.uploadMemberPhoto(memberId, photoFile);
      }

      setSuccess(`Student record for ${formData.first_name} ${formData.last_name} saved.`);
      setModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setError(err?.message || "Failed to save student record.");
    } finally {
      setSaving(false);
    }
  };

  const handleBulkSubmit = async () => {
    const pendingIds = members
      .filter(m => m.status === "DRAFT" || m.status === "CHANGES_REQUESTED")
      .map(m => m.id);

    if (pendingIds.length === 0) {
      setError("No draft or returned records to submit for review.");
      return;
    }

    try {
      setSubmittingBatch(true);
      setError(null);
      const res = await api.bulkSubmitMembers(pendingIds);
      setSuccess(`${res?.count || pendingIds.length} student records submitted to Organization Admin for review.`);
      await fetchData();
    } catch (err: any) {
      setError(err?.message || "Failed to submit records for review.");
    } finally {
      setSubmittingBatch(false);
    }
  };

  // Filter members
  const filtered = members.filter(m => {
    const fullName = `${m.first_name || m.name || ""} ${m.last_name || ""}`.toLowerCase();
    const ident = (m.identifier || m.roll_number || m.admission_number || "").toLowerCase();
    const matchesSearch = fullName.includes(search.toLowerCase()) || ident.includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const countDrafts = members.filter(m => m.status === "DRAFT").length;
  const countSubmitted = members.filter(m => m.status === "SUBMITTED").length;
  const countChangesReq = members.filter(m => m.status === "CHANGES_REQUESTED").length;
  const countApproved = members.filter(m => m.status === "APPROVED").length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assigned Scope</span>
            <Badge variant="default">{currentUser?.assigned_class || "All Classes"}</Badge>
          </div>
          <h1 className="text-lg font-bold text-slate-900 mt-1">Student Data Entry Roster</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Enter demographic details, upload photos, and forward batches to your administrator for card validation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 bg-[#15803D] hover:bg-[#14532D] text-white text-xs font-semibold rounded-xl shadow-sm shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Student
          </button>

          {(countDrafts > 0 || countChangesReq > 0) && (
            <button
              onClick={handleBulkSubmit}
              disabled={submittingBatch}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm shadow-emerald-600/20 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              {submittingBatch ? "Submitting..." : `Submit ${countDrafts + countChangesReq} Records for Review`}
            </button>
          )}
        </div>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div 
          onClick={() => setStatusFilter("DRAFT")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === "DRAFT" 
              ? "bg-emerald-50/60 border-emerald-300 ring-2 ring-emerald-500/20" 
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Drafts</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{countDrafts}</div>
        </div>

        <div 
          onClick={() => setStatusFilter("SUBMITTED")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === "SUBMITTED" 
              ? "bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20" 
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="text-[11px] font-semibold text-[#15803D] uppercase">Under Review</div>
          <div className="text-xl font-bold text-[#14532D] mt-1">{countSubmitted}</div>
        </div>

        <div 
          onClick={() => setStatusFilter("CHANGES_REQUESTED")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === "CHANGES_REQUESTED" 
              ? "bg-amber-50/60 border-amber-300 ring-2 ring-amber-500/20" 
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="text-[11px] font-semibold text-amber-600 uppercase">Needs Correction</div>
          <div className="text-xl font-bold text-amber-900 mt-1">{countChangesReq}</div>
        </div>

        <div 
          onClick={() => setStatusFilter("APPROVED")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === "APPROVED" 
              ? "bg-emerald-50/60 border-emerald-300 ring-2 ring-emerald-500/20" 
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="text-[11px] font-semibold text-emerald-600 uppercase">Admin Approved</div>
          <div className="text-xl font-bold text-emerald-900 mt-1">{countApproved}</div>
        </div>
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

      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student name or roll number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium"
            >
              <option value="ALL">All Records</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Under Review</option>
              <option value="CHANGES_REQUESTED">Needs Correction</option>
              <option value="APPROVED">Approved</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-[#15803D] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading class roster...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No student records in this view</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
              Click &quot;Add Student&quot; above to begin registering student details for {currentUser?.assigned_class || "your cohort"}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Photo</th>
                  <th className="px-5 py-3.5">Student Name</th>
                  <th className="px-5 py-3.5">Roll / Identifier</th>
                  <th className="px-5 py-3.5">Cohort</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Review Feedback</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((m: Member) => (
                  <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                        {m.photo_url ? (
                          <img src={m.photo_url} alt={m.first_name || m.name} className="w-full h-full object-cover" />
                        ) : (
                          <Camera className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 font-bold text-slate-900">
                      {m.first_name || m.name} {m.last_name || ""}
                      {m.phone && <span className="block font-normal text-[10px] text-slate-400">{m.phone}</span>}
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-700 text-xs font-semibold">
                      {m.identifier || m.roll_number || m.admission_number}
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-[#15803D] font-medium text-[11px]">
                        {m.class_grade || m.class_name || "Unassigned"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {m.status === "APPROVED" && <Badge variant="success">Approved</Badge>}
                      {m.status === "SUBMITTED" && <Badge variant="default">Under Review</Badge>}
                      {m.status === "CHANGES_REQUESTED" && <Badge variant="destructive">Correction Required</Badge>}
                      {(!m.status || m.status === "DRAFT") && <Badge variant="secondary">Draft</Badge>}
                    </td>
                    <td className="px-5 py-3 max-w-xs">
                      {m.status === "CHANGES_REQUESTED" && m.rejection_reason ? (
                        <div className="p-2 rounded-lg bg-rose-50 border border-rose-100 text-rose-700 text-[11px] leading-tight">
                          <span className="font-semibold block">Admin Feedback:</span>
                          {m.rejection_reason}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPreviewingMember(m)}
                          className="p-1.5 text-slate-500 hover:text-[#15803D] hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="View 3D ID Card"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {m.status !== "APPROVED" ? (
                          <button
                            onClick={() => handleOpenEdit(m)}
                            className="px-2.5 py-1 text-xs font-semibold text-[#15803D] hover:text-[#14532D] hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">Locked</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Student Modal with Live 3D Preview */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150 my-8">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#15803D]" />
                  {editingMember ? "Edit Student Record" : "Add Student Record"}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Cohort: <strong className="text-slate-800">{formData.class_grade || currentUser?.assigned_class || "Assigned Section"}</strong> • Card updates live in real time
                </p>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-100">
              {/* Form Input Area (7 cols) */}
              <form onSubmit={(e) => handleSubmit(e, false)} className="md:col-span-7 p-6 space-y-4">
                {/* Photo uploader */}
                <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-16 h-16 rounded-xl bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center border border-slate-300">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs cursor-pointer"
                    >
                      {photoPreview ? "Change Photo" : "Upload Photograph"}
                    </button>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Portrait photo on plain background (JPG or PNG)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Verma"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Roll No / Student ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 2026-A101"
                      value={formData.identifier}
                      onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Class / Grade
                    </label>
                    <input
                      type="text"
                      disabled={!!currentUser?.assigned_class}
                      placeholder="e.g. Grade 1-A"
                      value={formData.class_grade}
                      onChange={(e) => setFormData({ ...formData, class_grade: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-75 disabled:bg-slate-100 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 9876543210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Blood Group
                    </label>
                    <input
                      type="text"
                      placeholder="O+, B+, A-, etc."
                      value={formData.blood_group}
                      onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Emergency Parent Contact
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 9123456789"
                      value={formData.emergency_contact}
                      onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 disabled:opacity-50 cursor-pointer"
                    >
                      {saving ? "Saving..." : "Save as Draft"}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={(e) => handleSubmit(e, true)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#15803D] hover:bg-[#14532D] text-white shadow-sm shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                    >
                      {saving ? "Saving..." : "Save & Submit to Admin"}
                    </button>
                  </div>
                </div>
              </form>

              {/* Right Live 3D Card Simulation (5 cols) */}
              <div className="md:col-span-5 p-6 bg-slate-50/70 flex flex-col items-center justify-between">
                <div className="w-full flex items-center justify-between border-b border-slate-200/60 pb-2 mb-2">
                  <span className="text-[10px] font-black uppercase text-[#15803D] tracking-wider">
                    Live Approved Template Preview
                  </span>
                  <Badge variant={photoPreview && formData.first_name && formData.identifier ? "success" : "secondary"} className="text-[9px]">
                    {photoPreview && formData.first_name && formData.identifier ? "Ready for Print" : "Draft Incomplete"}
                  </Badge>
                </div>

                <div className="py-4 flex items-center justify-center">
                  <Card3DViewer
                    student={{
                      first_name: formData.first_name,
                      last_name: formData.last_name,
                      identifier: formData.identifier,
                      class_grade: formData.class_grade || currentUser?.assigned_class,
                      blood_group: formData.blood_group,
                      dob: formData.dob,
                      emergency_contact: formData.emergency_contact,
                      photo_url: photoPreview
                    }}
                    template={{
                      primary_color: "#1e3a8a",
                      secondary_color: "#3b82f6",
                      org_name: "St. Xavier's International Academy",
                      academic_year: "2026 - 2027",
                      orientation: "portrait"
                    }}
                    size="sm"
                    showControls={true}
                    interactiveTilt={true}
                  />
                </div>

                <p className="text-[10px] text-slate-400 text-center mt-2 leading-tight">
                  This card reflects the approved institutional layout. Modifications to typography or positions are locked to ensure print standard adherence.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick 3D Card Inspection Modal */}
      {previewingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in-50 zoom-in-95">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  {previewingMember.first_name} {previewingMember.last_name}
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  ID: {previewingMember.identifier || previewingMember.roll_number} • {previewingMember.class_grade || "Class"}
                </p>
              </div>
              <button
                onClick={() => setPreviewingMember(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-2 flex items-center justify-center">
              <Card3DViewer
                student={{
                  first_name: previewingMember.first_name,
                  last_name: previewingMember.last_name,
                  identifier: previewingMember.identifier || previewingMember.roll_number,
                  class_grade: previewingMember.class_grade,
                  blood_group: previewingMember.blood_group,
                  dob: previewingMember.dob,
                  emergency_contact: previewingMember.emergency_contact || previewingMember.phone,
                  photo_url: previewingMember.photo_url || previewingMember.avatar_url
                }}
                template={{
                  primary_color: "#1e3a8a",
                  secondary_color: "#3b82f6",
                  org_name: "St. Xavier's International Academy",
                  academic_year: "2026 - 2027",
                  orientation: "portrait"
                }}
                size="md"
                showControls={true}
                interactiveTilt={true}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewingMember(null)}
                className="text-xs text-slate-700 border-slate-200"
              >
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
