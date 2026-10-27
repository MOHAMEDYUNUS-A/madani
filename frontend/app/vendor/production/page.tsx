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
  Package
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
            <Printer className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Fulfillment Pipeline
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-1">
            Centralized Print Production & Dispatch
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Real-time tracking of vendor-submitted physical card production runs, quality inspections, and courier delivery.
          </p>
        </div>
        <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs">
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
          <Printer className="w-12 h-12 mx-auto text-slate-600" />
          <h3 className="text-base font-bold text-white">No active print production jobs</h3>
          <p className="text-slate-500 text-xs max-w-md mx-auto">
            Once an organization approves a batch snapshot, you can submit the physical print job to Madani centralized production.
          </p>
          <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs mt-2">
            <Link href="/vendor/ai-studio">
              Create New Design in AI Studio
            </Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-4">Job ID</th>
                  <th className="p-4">Client Organization</th>
                  <th className="p-4">Quantity</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Commercials</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-700">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-mono font-bold text-amber-400">{job.job_id}</td>
                    <td className="p-4 font-semibold text-white">{job.organization_name}</td>
                    <td className="p-4">{job.quantity} cards</td>
                    <td className="p-4">{getStatusBadge(job.status)}</td>
                    <td className="p-4 font-semibold text-white">₹{job.total_amount?.toFixed(2)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        job.payment_status === "Confirmed" 
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}>
                        {job.payment_status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500">
                      {new Date(job.created_at).toLocaleDateString()}
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
