"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { 
  Sparkles, 
  Plus, 
  Building2, 
  Printer, 
  ExternalLink, 
  ShieldCheck, 
  Layers, 
  TrendingUp, 
  X,
  FileCheck2,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function VendorDashboardPage() {
  const [vendorData, setVendorData] = useState<any>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // New Org Form State
  const [newOrg, setNewOrg] = useState({
    name: "",
    org_type: "School",
    short_name: "",
    city: "",
    state: "",
    admin_name: "",
    admin_email: "",
    admin_username: "",
    admin_password: "password123"
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const user = await api.getMe();
      if (user.vendor_id) {
        const vDetails = await api.getVendorDetails(user.vendor_id);
        setVendorData(vDetails);
        const orgList = await api.getVendorOrganizations(user.vendor_id);
        setOrganizations(orgList);
      } else {
        const vendors = await api.getVendors();
        if (vendors.length > 0) {
          const vDetails = await api.getVendorDetails(vendors[0].id);
          setVendorData(vDetails);
          const orgList = await api.getVendorOrganizations(vendors[0].id);
          setOrganizations(orgList);
        }
      }
    } catch (err) {
      console.error("Failed to load vendor data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.register(newOrg);
      setShowOrgModal(false);
      setNewOrg({
        name: "",
        org_type: "School",
        short_name: "",
        city: "",
        state: "",
        admin_name: "",
        admin_email: "",
        admin_username: "",
        admin_password: "password123"
      });
      loadDashboard();
    } catch (err: any) {
      alert(err.message || "Failed to create organization");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const sub = vendorData?.subscription || {
    plan_name: "Starter Plan",
    ai_generations_used: 12,
    max_ai_generations: 100,
    pdf_generations_used: 45,
    max_pdf_generations: 500,
    max_organizations: 5
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
              {vendorData?.vendor_id || "MAD-VND-000001"}
            </span>
            <Badge variant="outline" className="text-[10px] uppercase font-semibold text-amber-400 border-amber-500/30">
              {sub.plan_name}
            </Badge>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-1">
            {vendorData?.business_name || "Vendor Studio"}
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Multi-tenant credential agency console &bull; Enterprise fulfillment lifecycle
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button asChild className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs" size="sm">
            <Link href="/vendor/ai-studio">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Launch AI Studio
            </Link>
          </Button>
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setShowOrgModal(true)}
            className="text-xs font-semibold text-slate-800 border-slate-300 hover:bg-slate-800"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Onboard Organization
          </Button>
        </div>
      </div>

      {/* Quotas & Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
          <div className="flex justify-between items-center text-xs text-slate-500 font-semibold">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> AI DESIGN QUOTA
            </span>
            <span className="text-amber-400 font-mono font-bold">{sub.ai_generations_used} / {sub.max_ai_generations}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div 
              className="h-full bg-amber-500 transition-all duration-500"
              style={{ width: `${Math.min(100, (sub.ai_generations_used / sub.max_ai_generations) * 100)}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-slate-500">Multi-variation card design generations used this billing cycle.</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
          <div className="flex justify-between items-center text-xs text-slate-500 font-semibold">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" /> CLIENT ORGANIZATIONS
            </span>
            <span className="text-emerald-400 font-mono font-bold">{organizations.length} / {sub.max_organizations}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(100, (organizations.length / sub.max_organizations) * 100)}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-slate-500">Institutions managed under this tenant account.</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
          <div className="flex justify-between items-center text-xs text-slate-500 font-semibold">
            <span className="flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5 text-indigo-400" /> PDF IMPOSITION RUNS
            </span>
            <span className="text-indigo-400 font-mono font-bold">{sub.pdf_generations_used} / {sub.max_pdf_generations}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div 
              className="h-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${Math.min(100, (sub.pdf_generations_used / sub.max_pdf_generations) * 100)}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-slate-500">High-resolution vector print batch compilations.</p>
        </div>
      </div>

      {/* Organizations Directory */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" /> Managed Client Organizations
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Institutions whose ID card workflows are managed by your agency</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowOrgModal(true)}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 hover:bg-slate-800"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> New Organization
          </Button>
        </div>

        {organizations.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Building2 className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-slate-500 text-xs">No client organizations onboarded yet under your vendor account.</p>
            <Button
              onClick={() => setShowOrgModal(true)}
              size="sm"
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
            >
              Add First Client Organization
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {organizations.map((org) => (
              <div key={org.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-amber-400 border border-slate-300">
                    {org.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{org.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="font-mono text-amber-400/80">{org.org_id}</span>
                      <span>&bull;</span>
                      <span>{org.org_type}</span>
                      {org.city && <span>&bull; {org.city}, {org.state}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button asChild size="sm" variant="outline" className="text-xs text-amber-400 border-amber-500/30 hover:bg-amber-500/10">
                    <Link href={`/vendor/ai-studio?org_id=${org.id}`}>
                      <Sparkles className="w-3 h-3 mr-1" /> AI Studio
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="ghost" className="text-xs text-slate-700 hover:bg-slate-800">
                    <Link href={`/organization/students`}>
                      Open Workspace <ExternalLink className="w-3 h-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Onboard Organization Modal */}
      {showOrgModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in-50 zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-400" /> Onboard Client Organization
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Provisions an isolated tenant workspace</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowOrgModal(false)}
                className="h-8 w-8 text-slate-500 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Organization Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex High School"
                  value={newOrg.name}
                  onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Type *</label>
                  <select
                    value={newOrg.org_type}
                    onChange={(e) => setNewOrg({ ...newOrg, org_type: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                  >
                    <option value="School">School</option>
                    <option value="College">College</option>
                    <option value="University">University</option>
                    <option value="Corporate">Corporate</option>
                    <option value="Hospital">Hospital</option>
                    <option value="Industrial">Industrial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Short Code</label>
                  <input
                    type="text"
                    placeholder="e.g. APEX"
                    value={newOrg.short_name}
                    onChange={(e) => setNewOrg({ ...newOrg, short_name: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">City</label>
                  <input
                    type="text"
                    value={newOrg.city}
                    onChange={(e) => setNewOrg({ ...newOrg, city: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">State</label>
                  <input
                    type="text"
                    value={newOrg.state}
                    onChange={(e) => setNewOrg({ ...newOrg, state: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Client Admin Account
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Admin Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Principal / Director"
                      value={newOrg.admin_name}
                      onChange={(e) => setNewOrg({ ...newOrg, admin_name: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Admin Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="admin@school.com"
                      value={newOrg.admin_email}
                      onChange={(e) => setNewOrg({ ...newOrg, admin_email: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Username *</label>
                    <input
                      type="text"
                      required
                      placeholder="apex_admin"
                      value={newOrg.admin_username}
                      onChange={(e) => setNewOrg({ ...newOrg, admin_username: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Initial Password *</label>
                    <input
                      type="password"
                      required
                      value={newOrg.admin_password}
                      onChange={(e) => setNewOrg({ ...newOrg, admin_password: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-200">
                <Button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  {creating ? "Provisioning Tenant..." : "Create Tenant Workspace"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowOrgModal(false)}
                  className="text-xs text-slate-700 border-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
