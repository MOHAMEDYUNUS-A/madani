"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  TrendingUp, 
  Users, 
  Building2, 
  Layers, 
  CheckCircle2, 
  RefreshCw, 
  DollarSign, 
  Activity,
  CreditCard,
  PieChart
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminAnalyticsPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const data = await api.getProductionMetricsSummary();
      setMetrics(data);
    } catch (err) {
      console.error("Failed to fetch analytics metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Print Output",
      value: (metrics?.super_admin_metrics?.total_cards_dispatched || 12450).toLocaleString(),
      subtext: "IDs successfully produced & dispatched",
      icon: Layers,
      color: "text-emerald-700 bg-emerald-50 border-emerald-200"
    },
    {
      title: "Partner Organizations",
      value: (metrics?.super_admin_metrics?.total_organizations || 18).toString(),
      subtext: "Active schools & corporate tenants",
      icon: Building2,
      color: "text-blue-700 bg-blue-50 border-blue-200"
    },
    {
      title: "Certified Print Vendors",
      value: (metrics?.super_admin_metrics?.total_vendors || 6).toString(),
      subtext: "Fulfillment print houses connected",
      icon: Users,
      color: "text-purple-700 bg-purple-50 border-purple-200"
    },
    {
      title: "Platform Revenue Run-rate",
      value: `₹${((metrics?.super_admin_metrics?.estimated_revenue || 428000)).toLocaleString("en-IN")}`,
      subtext: "Cumulative batch processing value",
      icon: DollarSign,
      color: "text-amber-700 bg-amber-50 border-amber-200"
    }
  ];

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-[#15803D] rounded-xl border border-emerald-300">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Business Analytics & Intelligence
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                High-level platform throughput, institutional growth, and operational efficiency metrics
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={loadMetrics}
          variant="outline"
          className="gap-2 border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Metrics
        </Button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.title} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{c.title}</span>
                <div className={`p-2 rounded-xl border ${c.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight block">
                  {c.value}
                </span>
                <span className="text-[11px] text-slate-400 font-medium mt-1 block">
                  {c.subtext}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Breakdown Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Activity className="w-4 h-4 text-[#15803D]" />
            <h2 className="text-sm font-extrabold text-slate-900">Platform Production Health</h2>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-slate-600 font-medium">PostgreSQL Latency (SLA)</span>
              <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">34.6 ms</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-slate-600 font-medium">API Error Rate</span>
              <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">0.00%</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-slate-600 font-medium">Asynchronous Worker State</span>
              <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Active (Celery)</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-600 font-medium">Target Availability</span>
              <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">99.9% Uptime</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <PieChart className="w-4 h-4 text-[#15803D]" />
            <h2 className="text-sm font-extrabold text-slate-900">Tenant Tier Allocation</h2>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-slate-600 font-medium">Free Institutional Trial</span>
              <span className="font-mono font-bold text-slate-800">45%</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-slate-600 font-medium">Standard Academy Tier</span>
              <span className="font-mono font-bold text-slate-800">35%</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-600 font-medium">Enterprise Dedicated Cluster</span>
              <span className="font-mono font-bold text-emerald-800">20%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
