"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  Layers, 
  RefreshCw, 
  Search, 
  CheckCircle2, 
  Clock, 
  Truck, 
  AlertCircle, 
  FileText,
  Filter,
  DollarSign
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await api.getOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch = 
      (o.order_number || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.organization_id || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || (o.status || "").toUpperCase() === statusFilter.toUpperCase();
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const s = (status || "").toUpperCase();
    if (s.includes("DELIVERED") || s.includes("COMPLETED")) {
      return <Badge className="bg-emerald-100 text-[#14532D] border-emerald-300 font-bold">Delivered</Badge>;
    }
    if (s.includes("DISPATCH") || s.includes("TRANSIT")) {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-bold">Dispatched</Badge>;
    }
    if (s.includes("PROD") || s.includes("PRINT")) {
      return <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold">In Production</Badge>;
    }
    return <Badge className="bg-slate-100 text-slate-700 border-slate-300 font-bold">{status || "Pending"}</Badge>;
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-[#15803D] rounded-xl border border-emerald-300">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                All Orders & Fulfillment
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Global institutional print order lifecycle, invoices, and distribution records
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={loadOrders}
          variant="outline"
          className="gap-2 border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Orders
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Order ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <div className="flex gap-1.5 overflow-x-auto text-xs">
            {["ALL", "PENDING", "PROCESSING", "DISPATCHED", "DELIVERED"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  statusFilter === st
                    ? "bg-[#14532D] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Organization</th>
                <th className="py-3 px-4">Quantity</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Order Status</th>
                <th className="py-3 px-4">Date Placed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      <span>Loading orders...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-sm text-slate-700">No Orders Found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Approved print batches submitted by organizations will appear here.</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {order.order_number || order.id?.slice(0, 8)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {order.organization_name || order.organization_id?.slice(0, 8) || "N/A"}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                      {order.quantity?.toLocaleString() || "100"} cards
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-800">
                      ₹{(order.total_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {order.created_at ? new Date(order.created_at).toLocaleDateString() : "Today"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
