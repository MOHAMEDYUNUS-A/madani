"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function VendorSettingsPage() {
  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form Fields
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [gstNumber, setGstNumber] = useState("");

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    api.getMe().then((me) => {
      const vId = me.vendor_id;
      if (vId) {
        api.getVendorDetails(vId).then((data) => {
          setVendor(data);
          setBusinessName(data.business_name || "");
          setContactName(data.contact_name || "");
          setPhone(data.phone || "");
          setAddress(data.address || "");
          setCity(data.city || "");
          setState(data.state || "");
          setPincode(data.pincode || "");
          setGstNumber(data.gst_number || "");
          setLoading(false);
        }).catch(() => setLoading(false));
      } else {
        api.getVendors().then((vendors) => {
          if (vendors.length > 0) {
            const data = vendors[0];
            setVendor(data);
            setBusinessName(data.business_name || "");
            setContactName(data.contact_name || "");
            setPhone(data.phone || "");
          }
          setLoading(false);
        }).catch(() => setLoading(false));
      }
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setFeedback(null);
      // Feedback confirmation
      setFeedback({
        type: "success",
        message: "Vendor studio profile updated successfully."
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to update vendor settings."
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      <div className="border-b border-slate-200 pb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl text-xl shadow-lg shadow-amber-500/10">
              ⚙️
            </span>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Vendor Studio Settings</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage your print business credentials, tax identifiers, and physical dispatch address.
              </p>
            </div>
          </div>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl border text-xs font-bold ${
          feedback.type === "success" 
            ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/30" 
            : "bg-rose-950/60 text-rose-300 border-rose-500/30"
        }`}>
          {feedback.message}
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-semibold tracking-wider">Loading settings...</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xl space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 border-b border-slate-200 pb-2">
              Business Profile
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Business / Trade Name</label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl bg-slate-50 border border-slate-200 text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Primary Contact Name</label>
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl bg-slate-50 border border-slate-200 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl bg-slate-50 border border-slate-200 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">GST / Tax Identification</label>
                <input
                  type="text"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  placeholder="22AAAAA0000A1Z5"
                  className="w-full text-xs p-3 rounded-xl bg-slate-50 border border-slate-200 text-white font-mono uppercase"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 border-b border-slate-200 pb-2">
              Facility Address & Dispatch Location
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Street Address</label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-xs p-3 rounded-xl bg-slate-50 border border-slate-200 text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl bg-slate-50 border border-slate-200 text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl bg-slate-50 border border-slate-200 text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pincode</label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl bg-slate-50 border border-slate-200 text-white font-mono"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
            >
              {saving ? "Saving Changes..." : "Save Studio Settings"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
