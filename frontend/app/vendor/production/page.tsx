"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { 
  Clock, 
  CheckCircle2, 
  Printer, 
  Search, 
  Truck, 
  Box, 
  Check, 
  PackageCheck, 
  AlertCircle, 
  ExternalLink, 
  ShieldCheck,
  Package,
  FileDown,
  FileSpreadsheet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function VendorProductionPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const data = await api.getPrintJobs();
      setJobs(data);
    } catch (err) {
      console.error("Failed to load print jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Awaiting Review":
        return (
          <Badge variant="warning" className="text-[10px] flex items-center gap-1">
            <Clock className="w-3 h-3" /> Awaiting Review
          </Badge>
        );
      case "Approved for Production":
        return (
          <Badge variant="default" className="text-[10px] flex items-center gap-1 bg-blue-600 text-white">
            <CheckCircle2 className="w-3 h-3" /> Production Approved
          </Badge>
        );
      case "Printing":
        return (
          <Badge variant="purple" className="text-[10px] flex items-center gap-1 animate-pulse">
            <Printer className="w-3 h-3" /> Printing
          </Badge>
        );
      case "Quality Check":
        return (
          <Badge variant="outline" className="text-[10px] flex items-center gap-1 text-purple-400 border-purple-500/40">
            <ShieldCheck className="w-3 h-3" /> Quality Check
          </Badge>
        );
      case "Packed":
        return (
          <Badge variant="secondary" className="text-[10px] flex items-center gap-1">
            <Box className="w-3 h-3" /> Packed
          </Badge>
        );
      case "Dispatched":
        return (
          <Badge variant="warning" className="text-[10px] flex items-center gap-1 text-amber-300 border-amber-500/40">
            <Truck className="w-3 h-3" /> Dispatched
          </Badge>
        );
      case "Delivered":
      case "Completed":
        return (
          <Badge variant="success" className="text-[10px] flex items-center gap-1">
            <PackageCheck className="w-3 h-3" /> Delivered
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-emerald-700" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Fulfillment Pipeline
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            Centralized Print Production & Dispatch
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Real-time tracking of vendor-submitted physical card production runs, quality inspections, and courier delivery.
          </p>
        </div>
        <Button asChild size="sm" className="bg-[#15803D] hover:bg-[#14532D] text-white font-bold text-xs">
          <Link href="/organization/orders">
            <Package className="w-3.5 h-3.5 mr-1.5" /> Client Order Portal
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-xl bg-white" />
          <Skeleton className="h-64 w-full rounded-2xl bg-white" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-white border border-slate-200 space-y-3">
          <Printer className="w-12 h-12 mx-auto text-slate-400" />
          <h3 className="text-base font-bold text-slate-900">No active print production jobs</h3>
          <p className="text-slate-500 text-xs max-w-md mx-auto">
            Once an organization approves a batch snapshot, you can submit the physical print job to Madani centralized production.
          </p>
          <Button asChild size="sm" className="bg-[#15803D] hover:bg-[#14532D] text-white font-bold text-xs mt-2">
            <Link href="/vendor/ai-studio">
              Create New Design in AI Studio
            </Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-4">Job ID</th>
                  <th className="p-4">Client Organization</th>
                  <th className="p-4">Quantity</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Commercials</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4">Submitted</th>
                  <th className="p-4 text-right">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4 font-mono font-bold text-emerald-700">{job.job_id}</td>
                    <td className="p-4 font-semibold text-slate-900">{job.organization_name}</td>
                    <td className="p-4 font-medium">{job.quantity} cards</td>
                    <td className="p-4">{getStatusBadge(job.status)}</td>
                    <td className="p-4 font-semibold text-slate-900">₹{job.total_amount?.toFixed(2)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        job.payment_status === "Confirmed" 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}>
                        {job.payment_status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 font-medium">
                      {new Date(job.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => api.downloadPrintJobPdf(job.id, `${job.job_id}_imposition_A4.pdf`)}
                          className="h-7 px-2.5 text-[11px] font-bold text-[#15803D] hover:bg-emerald-50 border-emerald-300 cursor-pointer"
                          title="Download 300 DPI A4 Imposition PDF"
                        >
                          <FileDown className="w-3.5 h-3.5 mr-1" /> PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => api.downloadPrintJobCsv(job.id, `${job.job_id}_manifest.csv`)}
                          className="h-7 px-2 text-[11px] font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                          title="Download Student Manifest CSV"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-emerald-700" /> CSV
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
