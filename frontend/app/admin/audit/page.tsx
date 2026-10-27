"use client";

import { useEffect, useState } from "react";
import { 
  ShieldCheck, 
  RefreshCw, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Key, 
  Database, 
  FileCheck2,
  Lock,
  UserCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  status: "SUCCESS" | "WARNING" | "FAILURE";
  ip_address: string;
}

export default function AdminAuditPage() {
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const auditLogs: AuditEntry[] = [
    {
      id: "AUD-9821",
      timestamp: "Just now",
      actor: "superadmin (Platform Admin)",
      action: "USER_AUTHENTICATION_SUCCESS",
      resource: "Session / JWT Issued",
      status: "SUCCESS",
      ip_address: "103.21.244.12"
    },
    {
      id: "AUD-9820",
      timestamp: "12 mins ago",
      actor: "System SRE Automation",
      action: "DATABASE_HEALTH_PROBE_VERIFIED",
      resource: "PostgreSQL 15 Cluster",
      status: "SUCCESS",
      ip_address: "127.0.0.1 (Internal)"
    },
    {
      id: "AUD-9819",
      timestamp: "45 mins ago",
      actor: "rohan_apex (Vendor)",
      action: "PRINT_JOB_STATUS_UPDATED",
      resource: "Batch SNAP-2026-001 -> In Production",
      status: "SUCCESS",
      ip_address: "49.37.112.58"
    },
    {
      id: "AUD-9818",
      timestamp: "2 hours ago",
      actor: "alice_admin (Org Admin)",
      action: "BATCH_SNAPSHOT_LOCKED",
      resource: "Class 10-A (42 Records)",
      status: "SUCCESS",
      ip_address: "117.200.41.90"
    },
    {
      id: "AUD-9817",
      timestamp: "5 hours ago",
      actor: "priya_staff (Class Staff)",
      action: "STUDENT_PHOTO_UPLOADED",
      resource: "Student STU-00912",
      status: "SUCCESS",
      ip_address: "157.48.91.22"
    }
  ];

  const filteredLogs = auditLogs.filter((l) => 
    l.actor.toLowerCase().includes(search.toLowerCase()) ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.resource.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-[#15803D] rounded-xl border border-emerald-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Global Security & Audit Trail
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Immutable compliance event records, tenant administrative operations, and security logs
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={() => setLoading(false)}
          variant="outline"
          className="gap-2 border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Audit Trail
        </Button>
      </div>

      {/* Search Input */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Actor, Action, or Resource..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Audit ID</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4">Target Resource</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Source IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    {log.id}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">
                    {log.actor}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-[#14532D] font-bold">
                    {log.action}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {log.resource}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge className="bg-emerald-100 text-[#14532D] border-emerald-300 font-bold">
                      SUCCESS
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                    {log.ip_address}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
