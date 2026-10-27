"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CreditCard, Printer, Sparkles } from "lucide-react";

export default function VendorBillingPage() {
  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMe().then((me) => {
      const vId = me.vendor_id;
      if (vId) {
        api.getVendorDetails(vId).then((data) => {
          setVendor(data);
          setLoading(false);
        }).catch(() => setLoading(false));
      } else {
        api.getVendors().then((vendors) => {
          if (vendors.length > 0) {
            api.getVendorDetails(vendors[0].id).then((data) => {
              setVendor(data);
              setLoading(false);
            });
          } else {
            setLoading(false);
          }
        }).catch(() => setLoading(false));
      }
    }).catch(() => setLoading(false));
  }, []);

  const sub = vendor?.subscription;
  const planName = sub?.plan_name || "Starter Tier";
  const aiUsed = sub?.ai_generations_used || 0;
  const aiMax = sub?.max_ai_generations || 50;
  const pdfUsed = sub?.pdf_generations_used || 0;
  const pdfMax = sub?.max_pdf_generations || 200;

  const aiPct = Math.min(100, Math.round((aiUsed / aiMax) * 100));
  const pdfPct = Math.min(100, Math.round((pdfUsed / pdfMax) * 100));

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      <div className="border-b border-slate-200 pb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Subscription Plan & Billing</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage your studio subscription, AI generation quotas, and production capacity.
              </p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-semibold tracking-wider">Loading subscription details...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Plan Card */}
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-emerald-700 text-white rounded">
                ACTIVE SUBSCRIPTION
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2">{planName}</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Billing cycle renews automatically on the 1st of each month.
              </p>
            </div>

            <div className="text-right">
              <span className="text-2xl font-black text-emerald-700 font-mono">₹{sub?.price_monthly || "499"}</span>
              <span className="text-xs text-slate-500"> / month</span>
            </div>
          </div>

          {/* Usage Quotas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* AI Generations */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" /> Monthly AI Design Variations
                </span>
                <span className="text-xs font-mono font-bold text-emerald-700">
                  {aiUsed} / {aiMax}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${aiPct}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Each AI generation produces multiple distinct design variations with full front/back canvas geometry.
              </p>
            </div>

            {/* PDF Generations */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <Printer className="w-4 h-4 text-emerald-600" /> Monthly PDF Batch Cards
                </span>
                <span className="text-xs font-mono font-bold text-emerald-700">
                  {pdfUsed} / {pdfMax}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${pdfPct}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Vector CR80 PDF sheets with duplex mirrored flipping, crop marks, and bleed margins.
              </p>
            </div>
          </div>

          {/* Upgrade Matrix */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Available Tier Upgrades
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 shadow-2xs">
                <div className="font-bold text-slate-900 text-sm">Starter Tier</div>
                <div className="text-lg font-black text-emerald-700 font-mono">₹499/mo</div>
                <ul className="text-[11px] text-slate-600 space-y-1.5">
                  <li>✓ Up to 5 Client Organizations</li>
                  <li>✓ 50 AI Design Generations</li>
                  <li>✓ 200 PDF Cards / month</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-300 ring-1 ring-emerald-400/20 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 text-sm">Pro Studio</div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-600 text-white rounded">POPULAR</span>
                </div>
                <div className="text-lg font-black text-emerald-700 font-mono">₹1,999/mo</div>
                <ul className="text-[11px] text-slate-600 space-y-1.5">
                  <li>✓ Up to 25 Client Organizations</li>
                  <li>✓ 250 AI Design Generations</li>
                  <li>✓ 2,500 PDF Cards / month</li>
                  <li>✓ Priority Press Queue</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 shadow-2xs">
                <div className="font-bold text-slate-900 text-sm">Enterprise Press</div>
                <div className="text-lg font-black text-emerald-700 font-mono">Custom</div>
                <ul className="text-[11px] text-slate-600 space-y-1.5">
                  <li>✓ Unlimited Organizations</li>
                  <li>✓ Dedicated GPU Cluster</li>
                  <li>✓ Custom API Integrations</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
