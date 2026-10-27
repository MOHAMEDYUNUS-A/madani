"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { 
  Building2, 
  Search, 
  Plus, 
  Sparkles, 
  ArrowRight, 
  ExternalLink, 
  MapPin,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface OrganizationItem {
  id: string;
  org_id: string;
  name: string;
  org_type: string;
  city: string;
  state: string;
  is_active: boolean;
  created_at: string;
}

export default function VendorOrganizationsPage() {
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [vendorId, setVendorId] = useState<string | null>(null);

  useEffect(() => {
    api.getMe().then((me) => {
      const vId = me.vendor_id;
      setVendorId(vId);
      if (vId) {
        api.getVendorOrganizations(vId).then((data) => {
          setOrganizations(data);
          setLoading(false);
        }).catch(() => setLoading(false));
      } else {
        api.getVendors().then((vendors) => {
          if (vendors.length > 0) {
            setVendorId(vendors[0].id);
            api.getVendorOrganizations(vendors[0].id).then((data) => {
              setOrganizations(data);
              setLoading(false);
            });
          } else {
            setLoading(false);
          }
        }).catch(() => setLoading(false));
      }
    }).catch(() => setLoading(false));
  }, []);

  const filtered = organizations.filter(o => 
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    (o.org_id && o.org_id.toLowerCase().includes(search.toLowerCase())) ||
    (o.city && o.city.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Managed Client Organizations</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Register institutions, upload custom brand assets, and issue Organization Admin access invitations.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild size="sm" className="bg-[#15803D] hover:bg-[#14532D] text-white font-bold text-xs">
            <Link href="/vendor/organizations/new">
              <Plus className="w-3.5 h-3.5 mr-1" /> Onboard New Organization
            </Link>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by school, college name, code, or city..."
            className="w-full text-xs py-2.5 pl-10 pr-4 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <span className="text-xs font-mono text-slate-500">
          Showing {filtered.length} of {organizations.length} Organizations
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <Skeleton className="h-6 w-1/3 bg-slate-100" />
              <Skeleton className="h-8 w-3/4 bg-slate-100" />
              <Skeleton className="h-4 w-full bg-slate-100" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
          <Building2 className="w-10 h-10 mx-auto text-slate-400 mb-2" />
          <h3 className="text-sm font-bold text-slate-900">No Client Organizations Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You have not registered any client schools or colleges yet. Create your first client organization to start generating AI cards and managing production.
          </p>
          <Button asChild size="sm" className="bg-[#15803D] hover:bg-[#14532D] text-white font-bold text-xs mt-2">
            <Link href="/vendor/organizations/new">
              <Plus className="w-3.5 h-3.5 mr-1" /> Onboard Organization Now
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((org) => (
            <div
              key={org.id}
              className="bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl p-5 shadow-sm transition-all space-y-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono text-emerald-700 font-bold px-2 py-0.5 bg-emerald-50 border border-emerald-100 rounded">
                    {org.org_id || "MAD-ORG"}
                  </span>
                  <Badge 
                    variant={org.is_active ? "success" : "secondary"}
                    className="text-[10px]"
                  >
                    {org.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <h3 className="text-base font-bold text-slate-900 truncate">{org.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {org.org_type || "Institution"} &bull; {org.city || "India"} {org.state ? `, ${org.state}` : ""}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {new Date(org.created_at).toLocaleDateString()}
                </span>
                <Link
                  href={`/vendor/ai-studio?org_id=${org.id}`}
                  className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 transition-colors"
                >
                  <Sparkles className="w-3 h-3" /> Launch Studio <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
