"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { 
  Building2, 
  User, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft,
  ShieldCheck,
  Building,
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registeredOrg, setRegisteredOrg] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    org_type: "School",
    short_name: "",
    reg_number: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
    website: "",
    admin_name: "",
    admin_email: "",
    admin_phone: "",
    admin_username: "",
    admin_password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.register(formData);
      setRegisteredOrg(response);
      setStep(4); // Move to completion step
    } catch (err: any) {
      setError(err.message || "Failed to register organization. Please check fields.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#172033] flex flex-col justify-center items-center py-12 px-6 relative overflow-hidden">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#E2E8F0_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none" />

      {/* Header */}
      <Link href="/" className="flex items-center gap-3 mb-8 hover:opacity-90 transition-all relative z-10">
        <div className="w-10 h-10 rounded-xl bg-[#4F46E5] flex items-center justify-center font-extrabold text-white shadow-md shadow-indigo-500/20 text-base">
          M
        </div>
        <div>
          <span className="font-extrabold tracking-tight text-base text-[#172033] uppercase block leading-none">
            Madani ID Platform
          </span>
          <span className="text-[11px] text-[#64748B] font-semibold uppercase tracking-wider mt-1 block">
            Institution Registration
          </span>
        </div>
      </Link>

      <Card className="w-full max-w-xl bg-white border-[#E2E8F0] shadow-xl shadow-slate-200/50 relative z-10 rounded-2xl overflow-hidden">
        {/* Step Progress Top Bar */}
        <div className="w-full h-1.5 bg-[#F1F5F9]">
          <div 
            className="h-full bg-[#4F46E5] transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Step Indicator Header */}
        <div className="px-8 pt-6 pb-2 border-b border-[#E2E8F0] bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div 
                key={s}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s 
                    ? "bg-[#4F46E5] text-white shadow-xs" 
                    : step > s 
                    ? "bg-emerald-100 text-emerald-700" 
                    : "bg-[#F1F5F9] text-[#64748B]"
                }`}
              >
                {step > s ? "✓" : s}
              </div>
            ))}
          </div>
          <span className="text-xs font-semibold text-[#64748B]">
            {step === 1 && "Step 1 of 3: School Profile"}
            {step === 2 && "Step 2 of 3: Location Details"}
            {step === 3 && "Step 3 of 3: Administrator Credentials"}
            {step === 4 && "Registration Complete"}
          </span>
        </div>

        <div className="p-8">
          {error && (
            <div className="p-3.5 mb-6 text-xs text-[#DC2626] bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-bold text-[#172033]">Organization Details</h3>
                <p className="text-[#64748B] text-xs mt-1">Enter legal or educational details for your organization tenant</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#172033] uppercase tracking-wider mb-1.5">
                    Organization Name *
                  </label>
                  <Input 
                    type="text" 
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full bg-white border-[#E2E8F0] text-[#172033] placeholder:text-[#64748B] focus-visible:ring-[#818CF8]"
                    placeholder="e.g. M.A.M Matriculation Higher Secondary School"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[#172033] uppercase tracking-wider mb-1.5">
                      Institution Type *
                    </label>
                    <select 
                      name="org_type"
                      value={formData.org_type}
                      onChange={handleChange}
                      className="w-full h-10 px-3.5 rounded-xl border border-[#E2E8F0] bg-white text-xs font-medium text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#818CF8]"
                    >
                      <option>School</option>
                      <option>College</option>
                      <option>University</option>
                      <option>Corporate</option>
                      <option>Hospital</option>
                      <option>Hostel</option>
                      <option>Factory</option>
                      <option>Training Institute</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#172033] uppercase tracking-wider mb-1.5">
                      Short Code / Acronym
                    </label>
                    <Input 
                      type="text" 
                      name="short_name"
                      value={formData.short_name}
                      onChange={handleChange}
                      className="w-full bg-white border-[#E2E8F0] text-[#172033] placeholder:text-[#64748B] focus-visible:ring-[#818CF8]"
                      placeholder="e.g. MAMS"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#172033] uppercase tracking-wider mb-1.5">
                    Registration or Affiliation Code
                  </label>
                  <Input 
                    type="text" 
                    name="reg_number"
                    value={formData.reg_number}
                    onChange={handleChange}
                    className="w-full bg-white border-[#E2E8F0] text-[#172033] placeholder:text-[#64748B] focus-visible:ring-[#818CF8]"
                    placeholder="e.g. CBSE-AFF-2026-904"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-8 pt-4 border-t border-[#E2E8F0]">
                <Button 
                  type="button" 
                  onClick={nextStep}
                  disabled={!formData.name}
                  className="px-6 h-10 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold rounded-xl flex items-center gap-2"
                >
                  Continue to Address
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-bold text-[#172033]">Contact & Address</h3>
                <p className="text-[#64748B] text-xs mt-1">Specify dispatch and campus physical location</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#172033] uppercase tracking-wider mb-1.5">
                    Campus Address
                  </label>
                  <textarea 
                    name="address"
                    rows={2}
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-xs font-medium text-[#172033] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#818CF8]"
                    placeholder="Campus street, block, landmark..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[#172033] uppercase tracking-wider mb-1.5">
                      City
                    </label>
                    <Input 
                      type="text" 
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full bg-white border-[#E2E8F0] text-[#172033] placeholder:text-[#64748B] focus-visible:ring-[#818CF8]"
                      placeholder="e.g. Trichy"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#172033] uppercase tracking-wider mb-1.5">
                      State
                    </label>
                    <Input 
                      type="text" 
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className="w-full bg-white border-[#E2E8F0] text-[#172033] placeholder:text-[#64748B] focus-visible:ring-[#818CF8]"
                      placeholder="e.g. Tamil Nadu"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[#172033] uppercase tracking-wider mb-1.5">
                      PIN Code
                    </label>
                    <Input 
                      type="text" 
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleChange}
                      className="w-full bg-white border-[#E2E8F0] text-[#172033] placeholder:text-[#64748B] focus-visible:ring-[#818CF8]"
                      placeholder="e.g. 620021"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#172033] uppercase tracking-wider mb-1.5">
                      Official Website
                    </label>
                    <Input 
                      type="text" 
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      className="w-full bg-white border-[#E2E8F0] text-[#172033] placeholder:text-[#64748B] focus-visible:ring-[#818CF8]"
                      placeholder="e.g. https://mams.edu.in"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-8 pt-4 border-t border-[#E2E8F0]">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={prevStep}
                  className="px-5 h-10 border-[#E2E8F0] text-[#172033] text-xs font-semibold rounded-xl flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button 
                  type="button" 
                  onClick={nextStep}
                  className="px-6 h-10 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold rounded-xl flex items-center gap-2"
                >
                  Administrator Account
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <h3 className="text-lg font-bold text-[#172033]">Admin User Account</h3>
                <p className="text-[#64748B] text-xs mt-1">Credentials for the primary school administrator</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#172033] uppercase tracking-wider mb-1.5">
                    Administrator Full Name *
                  </label>
                  <Input 
                    type="text" 
                    name="admin_name"
                    required
                    value={formData.admin_name}
                    onChange={handleChange}
                    className="w-full bg-white border-[#E2E8F0] text-[#172033] placeholder:text-[#64748B] focus-visible:ring-[#818CF8]"
                    placeholder="e.g. Principal Dr. Mohamed Yunus"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[#172033] uppercase tracking-wider mb-1.5">
                      Email Address *
                    </label>
                    <Input 
                      type="email" 
                      name="admin_email"
                      required
                      value={formData.admin_email}
                      onChange={handleChange}
                      className="w-full bg-white border-[#E2E8F0] text-[#172033] placeholder:text-[#64748B] focus-visible:ring-[#818CF8]"
                      placeholder="admin@mams.edu.in"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#172033] uppercase tracking-wider mb-1.5">
                      Contact Phone
                    </label>
                    <Input 
                      type="text" 
                      name="admin_phone"
                      value={formData.admin_phone}
                      onChange={handleChange}
                      className="w-full bg-white border-[#E2E8F0] text-[#172033] placeholder:text-[#64748B] focus-visible:ring-[#818CF8]"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[#172033] uppercase tracking-wider mb-1.5">
                      Login Username *
                    </label>
                    <Input 
                      type="text" 
                      name="admin_username"
                      required
                      value={formData.admin_username}
                      onChange={handleChange}
                      className="w-full bg-white border-[#E2E8F0] text-[#172033] placeholder:text-[#64748B] focus-visible:ring-[#818CF8]"
                      placeholder="e.g. yunus_principal"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#172033] uppercase tracking-wider mb-1.5">
                      Secure Password *
                    </label>
                    <Input 
                      type="password" 
                      name="admin_password"
                      required
                      value={formData.admin_password}
                      onChange={handleChange}
                      className="w-full bg-white border-[#E2E8F0] text-[#172033] placeholder:text-[#64748B] focus-visible:ring-[#818CF8]"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-8 pt-4 border-t border-[#E2E8F0]">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={prevStep}
                  className="px-5 h-10 border-[#E2E8F0] text-[#172033] text-xs font-semibold rounded-xl flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading || !formData.admin_username || !formData.admin_password || !formData.admin_name}
                  className="px-8 h-10 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20"
                >
                  {loading ? "Registering Workspace..." : "Create Workspace"}
                </Button>
              </div>
            </form>
          )}

          {step === 4 && registeredOrg && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-[#059669] flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              
              <h3 className="text-xl font-extrabold text-[#172033] mb-1">Registration Complete</h3>
              <p className="text-[#64748B] text-xs max-w-sm mx-auto mb-6">
                Your organization workspace is provisioned with tenant isolation.
              </p>

              <div className="bg-[#F1F5F9] border border-[#E2E8F0] p-5 rounded-xl text-left max-w-md mx-auto mb-6 space-y-2.5">
                <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Workspace Identifiers</div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#64748B] font-medium">Institution Name:</span>
                  <span className="text-[#172033] font-bold">{registeredOrg.name}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#64748B] font-medium">System Org ID:</span>
                  <span className="bg-white border border-[#E2E8F0] text-indigo-700 font-mono text-[11px] px-2 py-0.5 rounded font-bold">
                    {registeredOrg.org_id}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#64748B] font-medium">Admin Username:</span>
                  <span className="text-[#172033] font-mono text-[11px] font-bold">{formData.admin_username}</span>
                </div>
              </div>

              <Link 
                href="/login" 
                className="inline-flex items-center gap-2 px-8 py-3 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20 transition-all"
              >
                Sign In to Workspace
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
