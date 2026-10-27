"use client";

import { useEffect, useState } from "react";
import { api, ClassItem } from "@/lib/api";
import { 
  GraduationCap, 
  Plus, 
  Users, 
  UserCheck, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Trash2, 
  AlertCircle,
  X,
  Layers,
  ArrowUpDown
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [formData, setFormData] = useState({ name: "", section: "", description: "" });
  const [saving, setSaving] = useState(false);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getClasses();
      setClasses(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load classes and sections.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleOpenCreate = () => {
    setEditingClass(null);
    setFormData({ name: "", section: "", description: "" });
    setError(null);
    setSuccess(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (c: ClassItem) => {
    setEditingClass(c);
    setFormData({
      name: c.name,
      section: c.section || "",
      description: c.description || ""
    });
    setError(null);
    setSuccess(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Class name is required.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      if (editingClass) {
        await api.updateClass(editingClass.id, {
          name: formData.name.trim(),
          section: formData.section.trim() || undefined,
          description: formData.description.trim() || undefined
        });
        setSuccess(`Class "${formData.name}" updated successfully.`);
      } else {
        await api.createClass({
          name: formData.name.trim(),
          section: formData.section.trim() || undefined,
          description: formData.description.trim() || undefined
        });
        setSuccess(`Class "${formData.name}" created successfully.`);
      }
      setModalOpen(false);
      await fetchClasses();
    } catch (err: any) {
      setError(err?.message || "Failed to save class. Check for duplicate names.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: ClassItem) => {
    if (!confirm(`Are you sure you want to delete "${c.name}"?`)) return;
    try {
      setError(null);
      await api.deleteClass(c.id);
      setSuccess(`Class "${c.name}" removed.`);
      await fetchClasses();
    } catch (err: any) {
      setError(err?.message || "Unable to delete class with active students.");
    }
  };

  const filteredClasses = classes.filter((c: ClassItem) => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.section && c.section.toLowerCase().includes(search.toLowerCase())) ||
    (c.assigned_staff && c.assigned_staff.some((s: string) => s.toLowerCase().includes(search.toLowerCase())))
  );

  const totalStudents = classes.reduce((sum, c) => sum + (c.student_count || 0), 0);
  const totalSections = classes.filter(c => !!c.section).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Classes & Sections</h1>
          <p className="text-xs text-slate-500 mt-1">
            Organize student cohorts, configure sections, and assign class staff.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#15803D] hover:bg-[#14532D] text-white text-xs font-semibold rounded-xl shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Class / Section
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#15803D] flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Total Classes</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{classes.length}</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Enrolled Students</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{totalStudents}</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#15803D] flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Defined Sections</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{totalSections}</div>
          </div>
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

      {/* Search and Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search classes, sections, or staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {filteredClasses.length} {filteredClasses.length === 1 ? "record" : "records"}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-[#15803D] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading class directory...
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="p-12 text-center">
            <GraduationCap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No classes found</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
              Create your organization&apos;s first class (e.g. &quot;Grade 1-A&quot; or &quot;LKG-Rose&quot;) to start assigning staff and entering students.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Class / Standard</th>
                  <th className="px-5 py-3.5">Section</th>
                  <th className="px-5 py-3.5">Assigned Class Staff</th>
                  <th className="px-5 py-3.5 text-center">Student Count</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClasses.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      {c.name}
                      {c.description && (
                        <span className="block text-[10px] text-slate-400 font-normal mt-0.5">
                          {c.description}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {c.section ? (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[11px] font-semibold">
                          {c.section}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      <span className="font-bold text-slate-800 text-xs">
                        {c.student_count || 0}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <Badge variant={c.is_active ? "success" : "secondary"}>
                        {c.is_active ? "Active" : "Archived"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                          title="Edit Class"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          title="Delete Class"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {editingClass ? "Edit Class" : "Create New Class / Cohort"}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Configure class nomenclature for student record assignment.
                </p>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Class Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grade 1-A or LKG-Rose"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Section Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. A, B, Rose, Morning"
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Primary wing, Room 204"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#15803D] hover:bg-[#14532D] text-white shadow-sm shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Saving..." : editingClass ? "Save Changes" : "Create Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
