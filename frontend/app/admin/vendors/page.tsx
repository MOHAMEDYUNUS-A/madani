"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  Building2, 
  Plus, 
  Search, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  X,
  CreditCard,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface VendorData {
  id: string;
  name: string;
  business_name?: string;
  contact_email: string;
  contact_phone?: string;
  status: string;
  plan_tier?: string;
  monthly_ai_tokens_quota?: number;
  monthly_ai_tokens_used?: number;
  monthly_card_generations_quota?: number;
  organizations_count?: number;
  created_at?: string;
}

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<VendorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Vendor Form
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [planTier, setPlanTier] = useState("STARTER");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const data = await api.getVendors();
      setVendors(data);
    } catch (err: any) {
      console.error("Failed to load vendors:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setFeedback(null);
      await api.createVendor({
        name,
        business_name: businessName || name,
        contact_email: contactEmail,
        contact_phone: contactPhone || undefined,
        plan_tier: planTier
      });
      setShowCreateModal(false);
      setName("");
      setBusinessName("");
      setContactEmail("");
      setContactPhone("");
      setFeedback({
        type: "success",
        message: `Vendor '${name}' created successfully on tier ${planTier}.`
      });
      await loadVendors();
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to create vendor."
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-[#15803D] border border-emerald-100 rounded-xl">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#172033] tracking-tight">Platform Vendors & Tiers</h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Manage registered print service providers, subscription plans, AI token quotas, and client organization mapping.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="bg-[#15803D] hover:bg-[#14532D] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Onboard New Vendor
          </Button>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
          feedback.type === "success" 
            ? "bg-emerald-50 text-[#059669] border-emerald-200" 
            : "bg-red-50 text-[#DC2626] border-red-200"
        }`}>
          {feedback.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center">
          <div className="w-8 h-8 border-3 border-[#15803D] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-[#64748B] font-semibold">Loading vendors...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-xs">
              <span className="text-[11px] font-bold uppercase text-[#64748B] tracking-wider">Total Vendors</span>
              <div className="text-2xl font-black text-[#172033] mt-1">{vendors.length}</div>
            </div>
            <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-xs">
              <span className="text-[11px] font-bold uppercase text-[#64748B] tracking-wider">Enterprise Tiers</span>
              <div className="text-2xl font-black text-[#15803D] mt-1">
                {vendors.filter(v => (v.plan_tier || "").toUpperCase() === "ENTERPRISE").length}
              </div>
            </div>
            <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-xs">
              <span className="text-[11px] font-bold uppercase text-[#64748B] tracking-wider">Pro Tiers</span>
              <div className="text-2xl font-black text-[#15803D] mt-1">
                {vendors.filter(v => (v.plan_tier || "").toUpperCase() === "PRO").length}
              </div>
            </div>
            <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-xs">
              <span className="text-[11px] font-bold uppercase text-[#64748B] tracking-wider">Active Status</span>
              <div className="text-2xl font-black text-[#059669] mt-1">
                {vendors.filter(v => v.status === "active").length}
              </div>
            </div>
          </div>

          {/* Vendors Table */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#172033] uppercase tracking-wider">Registered Vendors</h3>
              <span className="text-[11px] text-[#64748B] font-mono font-medium">Real-time sync</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F1F5F9] border-b border-[#E2E8F0] text-[10px] uppercase font-bold text-[#64748B]">
                  <tr>
                    <th className="p-4">Vendor Entity</th>
                    <th className="p-4">Subscription Plan</th>
                    <th className="p-4">AI Token Allowance</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Contact Info</th>
                    <th className="p-4 text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] font-medium text-[#172033]">
                  {vendors.map((v) => {
                    const tokensQuota = v.monthly_ai_tokens_quota || 200000;
                    const tokensUsed = v.monthly_ai_tokens_used || 0;
                    const pct = Math.min(100, Math.round((tokensUsed / tokensQuota) * 100));

                    return (
                      <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-[#172033] text-xs">{v.name}</div>
                          <div className="text-[11px] text-[#64748B]">{v.business_name || "Independent Studio"}</div>
                        </td>

                        <td className="p-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            (v.plan_tier || "").toUpperCase() === "ENTERPRISE"
                              ? "bg-emerald-50 text-[#15803D] border border-emerald-200"
                              : (v.plan_tier || "").toUpperCase() === "PRO"
                              ? "bg-emerald-100 text-[#14532D] border border-emerald-300"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}>
                            {v.plan_tier || "STARTER"}
                          </span>
                        </td>

                        <td className="p-4">
                          <div className="w-36 space-y-1">
                            <div className="flex justify-between text-[10px] font-mono text-[#64748B]">
                              <span>{tokensUsed.toLocaleString()}</span>
                              <span>{tokensQuota.toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-[#F1F5F9] h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  pct > 80 ? "bg-[#DC2626]" : "bg-[#15803D]"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            v.status === "active"
                              ? "bg-emerald-50 text-[#059669] border border-emerald-200"
                              : "bg-red-50 text-[#DC2626] border border-red-200"
                          }`}>
                            {v.status.toUpperCase()}
                          </span>
                        </td>

                        <td className="p-4">
                          <div className="text-[#172033] font-mono text-[11px]">{v.contact_email}</div>
                          {v.contact_phone && (
                            <div className="text-[10px] text-[#64748B] font-mono">{v.contact_phone}</div>
                          )}
                        </td>

                        <td className="p-4 text-right text-[#64748B] text-[11px]">
                          {v.created_at ? new Date(v.created_at).toLocaleDateString() : "Active"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Onboard Vendor Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-sm font-bold text-[#172033]">Onboard New Printing Vendor</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-[#64748B] hover:text-[#172033] text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleCreateVendor} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[#172033] uppercase tracking-wider mb-1">Vendor Entity Name</label>
                <Input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Apex ID Card Printers"
                  className="w-full text-xs bg-white border-[#E2E8F0] text-[#172033]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#172033] uppercase tracking-wider mb-1">Business / Registered Trade Name</label>
                <Input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Apex Digital Print Solutions Pvt Ltd"
                  className="w-full text-xs bg-white border-[#E2E8F0] text-[#172033]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#172033] uppercase tracking-wider mb-1">Contact Email</label>
                <Input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="vendor.admin@apexprints.com"
                  className="w-full text-xs bg-white border-[#E2E8F0] text-[#172033]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#172033] uppercase tracking-wider mb-1">Contact Phone</label>
                <Input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full text-xs bg-white border-[#E2E8F0] text-[#172033]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#172033] uppercase tracking-wider mb-1">Subscription Plan Tier</label>
                <select
                  value={planTier}
                  onChange={(e) => setPlanTier(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#E2E8F0] text-[#172033] font-semibold focus:outline-none focus:ring-2 focus:ring-[#818CF8]"
                >
                  <option value="FREE_TRIAL">Free Trial (50k Tokens, 100 Cards)</option>
                  <option value="STARTER">Starter Tier (200k Tokens, 1,000 Cards)</option>
                  <option value="PRO">Pro Tier (1M Tokens, 10,000 Cards)</option>
                  <option value="ENTERPRISE">Enterprise Tier (Unlimited / Custom)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="border-[#E2E8F0] text-[#172033] text-xs font-semibold rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#15803D] hover:bg-[#14532D] text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  {submitting ? "Onboarding..." : "Confirm & Activate Vendor"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
