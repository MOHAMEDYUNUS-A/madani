"use client";

import { useEffect, useState } from "react";
import { api, StaffUser, ClassItem } from "@/lib/api";
import { 
  UserCheck, 
  Plus, 
  Search, 
  Mail, 
  Shield, 
  GraduationCap, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  AlertCircle,
  X,
  Lock,
  UserX
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function StaffManagementPage() {
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    full_name: "",
    password: "",
    assigned_class: "",
    role: "STAFF"
  });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [staffData, classData] = await Promise.all([
        api.getStaff(),
        api.getClasses()
      ]);
      setStaffList(staffData);
      setClasses(classData);
    } catch (err: any) {
      setError(err?.message || "Failed to load staff roster and classes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreate = () => {
    setEditingStaff(null);
    setFormData({
      username: "",
      email: "",
      full_name: "",
      password: "",
      assigned_class: classes.length > 0 ? classes[0].name : "",
      role: "STAFF"
    });
    setError(null);
    setSuccess(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (s: StaffUser) => {
    setEditingStaff(s);
    setFormData({
      username: s.username,
      email: s.email,
      full_name: s.full_name,
      password: "",
      assigned_class: s.assigned_class || "",
      role: s.roles?.[0] || "STAFF"
    });
    setError(null);
    setSuccess(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.email.trim() || !formData.full_name.trim()) {
      setError("Name, username, and email are required.");
      return;
    }
    if (!editingStaff && !formData.password.trim()) {
      setError("Password is required for new accounts.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      if (editingStaff) {
        await api.updateStaff(editingStaff.id, {
          full_name: formData.full_name.trim(),
          email: formData.email.trim(),
          assigned_class: formData.assigned_class || undefined,
          roles: [formData.role],
          ...(formData.password ? { password: formData.password } : {})
        });
        setSuccess(`Staff account "${formData.full_name}" updated.`);
      } else {
        await api.createStaff({
          username: formData.username.trim().toLowerCase(),
          email: formData.email.trim(),
          full_name: formData.full_name.trim(),
          password: formData.password,
          assigned_class: formData.assigned_class || undefined,
          roles: [formData.role]
        });
        setSuccess(`Staff account "${formData.full_name}" created.`);
      }
      setModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setError(err?.message || "Failed to save staff account.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (s: StaffUser) => {
    try {
      setError(null);
      await api.updateStaff(s.id, { is_active: !s.is_active });
      setSuccess(`Account status updated for ${s.full_name}.`);
      await fetchData();
    } catch (err: any) {
      setError(err?.message || "Failed to change account status.");
    }
  };

  const filteredStaff = staffList.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.username.toLowerCase().includes(search.toLowerCase()) ||
    (s.assigned_class && s.assigned_class.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Staff Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Provision staff member logins, designate assigned classes, and regulate data-entry authorization.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Staff Member
        </button>
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

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search staff by name, email, or class..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {filteredStaff.length} {filteredStaff.length === 1 ? "staff" : "staff members"}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading staff accounts...
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-12 text-center">
            <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No staff accounts found</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
              Add class teachers or data operators to delegate student demographic and photo entry.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Staff Member</th>
                  <th className="px-5 py-3.5">Username / Email</th>
                  <th className="px-5 py-3.5">Assigned Class Scope</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      {s.full_name}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-mono text-slate-700 text-[11px]">@{s.username}</div>
                      <div className="text-[11px] text-slate-400">{s.email}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      {s.assigned_class ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-semibold text-[11px]">
                          <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                          {s.assigned_class}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">All Classes (Admin Scope)</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] font-semibold">
                        {s.roles?.[0] || "STAFF"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <Badge variant={s.is_active ? "success" : "secondary"}>
                        {s.is_active ? "Active" : "Suspended"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                          title="Edit Staff"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(s)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            s.is_active 
                              ? "hover:bg-rose-50 text-slate-400 hover:text-rose-600" 
                              : "hover:bg-emerald-50 text-slate-400 hover:text-emerald-600"
                          }`}
                          title={s.is_active ? "Deactivate" : "Activate"}
                        >
                          {s.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
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
                  {editingStaff ? "Edit Staff Account" : "Provision Staff Member"}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Set login credentials and restrict entry authorization by class.
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
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priya Sharma"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Username <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingStaff}
                    placeholder="e.g. priya_10a"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="priya@school.org"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {editingStaff ? "New Password (leave empty to keep current)" : "Account Password *"}
                </label>
                <input
                  type="password"
                  required={!editingStaff}
                  placeholder={editingStaff ? "••••••••" : "Minimum 6 characters"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Class / Cohort
                </label>
                <select
                  value={formData.assigned_class}
                  onChange={(e) => setFormData({ ...formData, assigned_class: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">No restriction (All Classes - Admin)</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} {c.section ? `(${c.section})` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  When assigned to a class, this user will only see and enter students for this specific cohort.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Portal Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="STAFF">Class Staff (Data Entry)</option>
                  <option value="DATA_ENTRY_STAFF">Data Entry Operator</option>
                  <option value="ORGANIZATION_ADMIN">Organization Co-Admin</option>
                </select>
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Saving..." : editingStaff ? "Save Changes" : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
