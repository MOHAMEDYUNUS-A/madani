"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Card3DViewer from "@/components/id-card/Card3DViewer";
import { 
  Building2, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Upload, 
  Sparkles, 
  Palette, 
  FileText, 
  ShieldCheck, 
  CreditCard,
  School,
  Layers,
  ChevronRight,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PRESET_COLORS = [
  { name: "Royal Blue", hex: "#1e3a8a", secondary: "#3b82f6" },
  { name: "Crimson Maroon", hex: "#881337", secondary: "#e11d48" },
  { name: "Emerald Academy", hex: "#065f46", secondary: "#10b981" },
  { name: "Classic Navy", hex: "#0f172a", secondary: "#475569" },
  { name: "Heritage Gold & Slate", hex: "#78350f", secondary: "#f59e0b" },
  { name: "Modern Violet", hex: "#5b21b6", secondary: "#8b5cf6" },
];

export default function VendorOrganizationOnboardingWizard() {
  const router = useRouter();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);

  // Step 1: Organization Details
  const [name, setName] = useState("");
  const [orgType, setOrgType] = useState("K-12 School");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [academicYear, setAcademicYear] = useState("2026 - 2027");
  const [website, setWebsite] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPhone, setAdminPhone] = useState("");

  // Step 2: ID Card Requirements
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [hasBackSide, setHasBackSide] = useState(true);
  const [reqFields, setReqFields] = useState<Record<string, boolean>>({
    fullName: true,
    photo: true,
    rollNumber: true,
    classSection: true,
    bloodGroup: true,
    dob: true,
    emergencyContact: true,
    address: true,
    busRoute: false
  });
  const [requirePrincipalSig, setRequirePrincipalSig] = useState(true);
  const [requireBarcode, setRequireBarcode] = useState(true);
  const [requireQrCode, setRequireQrCode] = useState(true);

  // Step 3: Branding Assets
  const [primaryColor, setPrimaryColor] = useState("#1e3a8a");
  const [secondaryColor, setSecondaryColor] = useState("#3b82f6");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Step 4: Design Brief
  const [designStyle, setDesignStyle] = useState("Academic Prestige");
  const [designBrief, setDesignBrief] = useState(
    "Clean, prestigious ID card with official institution crest at the top, high-visibility student photograph, prominent class-grade banner, and tamper-resistant security micro-patterns."
  );
  const [mandatoryContent, setMandatoryContent] = useState("Affiliated to State Board • Reg No: EDU/2026/8941");

  const [submitting, setSubmitting] = useState(false);
  const [createdResult, setCreatedResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getMe().then((me) => {
      if (me.vendor_id) {
        setVendorId(me.vendor_id);
        setLoading(false);
      } else {
        api.getVendors().then((vendors) => {
          if (vendors.length > 0) {
            setVendorId(vendors[0].id);
          }
          setLoading(false);
        }).catch(() => setLoading(false));
      }
    }).catch(() => setLoading(false));
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleField = (fieldKey: string) => {
    setReqFields(prev => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
  };

  const handleCompleteOnboarding = async () => {
    if (!vendorId) {
      setError("No associated Vendor ID found. Please log in as a Vendor.");
      return;
    }
    if (!name || !adminEmail || !adminName) {
      setError("Please complete all required fields (School Name, Admin Name, and Admin Email).");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // 1. Invite organization via vendor endpoint
      const res = await api.inviteOrganization(vendorId, {
        name,
        org_type: orgType,
        city: city || undefined,
        state: state || undefined,
        admin_name: adminName,
        admin_email: adminEmail
      });

      // 2. If organization created and we have its ID, initialize a Design Project with 3 concepts
      if (res?.organization?.id) {
        try {
          await api.createDesignProject({
            organization_id: res.organization.id,
            name: `${name} Official ID Suite`,
            brief: `${designStyle}: ${designBrief}. Mandatory layout text: ${mandatoryContent}`,
            card_category: orgType,
            card_width: orientation === "portrait" ? 2.125 : 3.375,
            card_height: orientation === "portrait" ? 3.375 : 2.125,
            orientation: orientation === "portrait" ? "Portrait" : "Landscape",
            has_back_side: hasBackSide,
            initial_variations: [
              {
                name: "Concept A: Clean Minimalist",
                style_category: "Minimalist Modern",
                card_width: orientation === "portrait" ? 2.125 : 3.375,
                card_height: orientation === "portrait" ? 3.375 : 2.125,
                orientation: orientation === "portrait" ? "Portrait" : "Landscape",
                quality_score: 96,
                front_canvas_json: { primaryColor, secondaryColor, style: "Minimal" },
                back_canvas_json: { primaryColor, secondaryColor, style: "Minimal" }
              },
              {
                name: "Concept B: Academic Prestige",
                style_category: "Academic Heritage",
                card_width: orientation === "portrait" ? 2.125 : 3.375,
                card_height: orientation === "portrait" ? 3.375 : 2.125,
                orientation: orientation === "portrait" ? "Portrait" : "Landscape",
                quality_score: 98,
                front_canvas_json: { primaryColor, secondaryColor, style: "Academic" },
                back_canvas_json: { primaryColor, secondaryColor, style: "Academic" }
              },
              {
                name: "Concept C: Dynamic Modern",
                style_category: "Modern Geometric",
                card_width: orientation === "portrait" ? 2.125 : 3.375,
                card_height: orientation === "portrait" ? 3.375 : 2.125,
                orientation: orientation === "portrait" ? "Portrait" : "Landscape",
                quality_score: 94,
                front_canvas_json: { primaryColor, secondaryColor, style: "Geometric" },
                back_canvas_json: { primaryColor, secondaryColor, style: "Geometric" }
              }
            ]
          });
        } catch {
          // Non-blocking if design studio variation creation returns
        }
      }

      setCreatedResult(res);
    } catch (err: any) {
      setError(err.message || "Failed to complete onboarding.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Sample student for live preview
  const previewStudent = {
    first_name: "Aarav",
    last_name: "Sharma",
    identifier: "2026-STU-042",
    class_grade: "Grade 1 - Section A",
    blood_group: "O+",
    dob: "12-May-2015",
    emergency_contact: "+91 98765 43210",
    address: `${city ? city + ", " : ""}${state ? state : "India"}`
  };

  const previewTemplate = {
    primary_color: primaryColor,
    secondary_color: secondaryColor,
    org_name: name || "Institution Name",
    org_logo: logoPreview,
    academic_year: academicYear,
    orientation: orientation
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Wizard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link 
              href="/vendor/organizations" 
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Organizations
            </Link>
            <span className="text-slate-700">•</span>
            <span className="text-xs font-semibold text-amber-600">Onboarding Wizard</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <School className="w-6 h-6 text-amber-500" /> Register Client Organization
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Collect school profile, card specifications, branding assets, and create initial design concepts.
          </p>
        </div>

        <Badge variant="warning" className="bg-amber-100 text-amber-800 border-amber-200 self-start sm:self-auto font-bold text-xs">
          Step {step} of 4: {step === 1 ? "School Details" : step === 2 ? "Card Requirements" : step === 3 ? "Branding Assets" : "Design Brief"}
        </Badge>
      </div>

      {/* Progress Stepper Bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { num: 1, title: "1. School Details", desc: "Identity & Admin" },
          { num: 2, title: "2. ID Requirements", desc: "Orientation & Fields" },
          { num: 3, title: "3. Brand Assets", desc: "Logo & Colors" },
          { num: 4, title: "4. Design Brief", desc: "Styles & Submission" }
        ].map((s) => (
          <button
            key={s.num}
            type="button"
            onClick={() => setStep(s.num)}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              step === s.num
                ? "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20"
                : step > s.num
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <div className="text-xs font-black truncate">{s.title}</div>
            <div className={`text-[10px] mt-0.5 truncate ${step === s.num ? "text-white/80" : "text-slate-500"}`}>
              {s.desc}
            </div>
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Main Two-Column Layout: Left Form + Right Live 3D Card Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form Area (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          {/* STEP 1: ORGANIZATION DETAILS */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-500" /> School / Organization Identity
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter school details. We will send an official portal access invitation to the designated school administrator.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Institution Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. St. Xavier's International Academy"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Organization Type</label>
                  <select
                    value={orgType}
                    onChange={(e) => setOrgType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium"
                  >
                    <option value="K-12 School">K-12 School</option>
                    <option value="High School">High School</option>
                    <option value="College & University">College &amp; University</option>
                    <option value="Vocational Institute">Vocational Institute</option>
                    <option value="Corporate Academy">Corporate Academy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Academic Year</label>
                  <input
                    type="text"
                    placeholder="2026 - 2027"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Bangalore"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">State / Province</label>
                  <input
                    type="text"
                    placeholder="e.g. Karnataka"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Official Website or Portal</label>
                <input
                  type="url"
                  placeholder="https://www.schoolportal.edu"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div className="border-t border-slate-100 pt-3">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
                  Authorized School Administrator
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Admin Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Rajesh Kumar"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Admin Official Email <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="principal@school.edu"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!name || !adminName || !adminEmail}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs cursor-pointer shadow-sm"
                >
                  Next: ID Card Requirements <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: ID CARD REQUIREMENTS */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-500" /> ID Card Technical Requirements
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure card orientation, front/back surfaces, required fields, and anti-counterfeit encoding.
                </p>
              </div>

              {/* Orientation Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Card Orientation</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setOrientation("portrait")}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      orientation === "portrait"
                        ? "bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500/20"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="text-xs font-bold">Portrait (Vertical)</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Standard CR80 (54mm × 85.6mm)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrientation("landscape")}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      orientation === "landscape"
                        ? "bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500/20"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="text-xs font-bold">Landscape (Horizontal)</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Standard CR80 (85.6mm × 54mm)</div>
                  </button>
                </div>
              </div>

              {/* Surface Option */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <div className="text-xs font-bold text-slate-800">Double-Sided PVC Print</div>
                  <div className="text-[10px] text-slate-500">Includes front identity face and reverse terms/emergency face</div>
                </div>
                <input
                  type="checkbox"
                  checked={hasBackSide}
                  onChange={(e) => setHasBackSide(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-0 w-4 h-4 cursor-pointer"
                />
              </div>

              {/* Student Fields Checklist */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Required Student Demographic Fields
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {[
                    { key: "fullName", label: "Full Student Name" },
                    { key: "photo", label: "Student Photo" },
                    { key: "rollNumber", label: "Admission / Roll No" },
                    { key: "classSection", label: "Class & Section" },
                    { key: "bloodGroup", label: "Blood Group" },
                    { key: "dob", label: "Date of Birth" },
                    { key: "emergencyContact", label: "Emergency Contact" },
                    { key: "address", label: "Residential Address" },
                    { key: "busRoute", label: "Bus Route / Stop" },
                  ].map((f) => (
                    <label 
                      key={f.key} 
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                        reqFields[f.key] ? "bg-amber-50/60 border-amber-300 text-slate-900 font-semibold" : "bg-slate-50 border-slate-200 text-slate-600"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={reqFields[f.key]}
                        onChange={() => toggleField(f.key)}
                        className="rounded text-amber-600 focus:ring-0"
                      />
                      <span className="text-[11px] truncate">{f.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Security & Authentication Features */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Anti-Counterfeit &amp; Validation Features
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requireQrCode}
                      onChange={(e) => setRequireQrCode(e.target.checked)}
                      className="rounded text-amber-600"
                    />
                    <span className="text-[11px] text-slate-700 font-medium">Dynamic QR Code</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requireBarcode}
                      onChange={(e) => setRequireBarcode(e.target.checked)}
                      className="rounded text-amber-600"
                    />
                    <span className="text-[11px] text-slate-700 font-medium">Code128 Barcode</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requirePrincipalSig}
                      onChange={(e) => setRequirePrincipalSig(e.target.checked)}
                      className="rounded text-amber-600"
                    />
                    <span className="text-[11px] text-slate-700 font-medium">Principal Sign</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="text-xs font-semibold text-slate-700 border-slate-200"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Previous
                </Button>
                <Button
                  type="button"
                  onClick={() => setStep(3)}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs cursor-pointer shadow-sm"
                >
                  Next: Branding Assets <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: BRANDING ASSETS */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-amber-500" /> Branding &amp; Color Scheme
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload the official institution crest/logo and select primary &amp; accent brand colors.
                </p>
              </div>

              {/* Logo Upload Box */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Official School Logo</label>
                <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/60 flex flex-col items-center justify-center gap-3 text-center">
                  {logoPreview ? (
                    <div className="flex items-center gap-4">
                      <img 
                        src={logoPreview} 
                        alt="Logo Preview" 
                        className="w-16 h-16 object-contain p-1 bg-white border border-slate-200 rounded-lg shadow-2xs"
                      />
                      <div className="text-left">
                        <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Logo Loaded
                        </span>
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          className="text-xs text-amber-700 font-semibold hover:underline block mt-1 cursor-pointer"
                        >
                          Replace File
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-2">
                        <Upload className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-800">Drag &amp; drop school crest here, or browse</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Supports PNG, SVG, or high-res JPG (Max 5MB)</p>
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="mt-3 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs cursor-pointer"
                      >
                        Choose File
                      </button>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={logoInputRef}
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Color Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Quick Color Harmony Presets
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => {
                        setPrimaryColor(c.hex);
                        setSecondaryColor(c.secondary);
                      }}
                      className={`p-2 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        primaryColor === c.hex 
                          ? "bg-slate-100 border-amber-500 ring-2 ring-amber-500/20" 
                          : "bg-slate-50 border-slate-200 hover:bg-slate-100/60"
                      }`}
                    >
                      <div className="flex -space-x-1">
                        <span className="w-4 h-4 rounded-full border border-white" style={{ backgroundColor: c.hex }} />
                        <span className="w-4 h-4 rounded-full border border-white" style={{ backgroundColor: c.secondary }} />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-800 truncate">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Hex Codes */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Primary Brand Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Secondary Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="text-xs font-semibold text-slate-700 border-slate-200"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Previous
                </Button>
                <Button
                  type="button"
                  onClick={() => setStep(4)}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs cursor-pointer shadow-sm"
                >
                  Next: Design Brief <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: DESIGN BRIEF & FINAL SUBMISSION */}
          {step === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-500" /> Vendor Design Brief &amp; Suite Creation
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Describe the design style and mandatory content. On submission, Madani Studio will generate 3 design concepts for school review.
                </p>
              </div>

              {/* Style Concept Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Intended Primary Style Concept</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "Academic Prestige", desc: "Heritage crest, serif headers, formal borders" },
                    { id: "Clean Minimalist", desc: "Light geometric shapes, generous whitespace" },
                    { id: "Modern Vibrant", desc: "Bold gradients, tech badges, high-contrast" }
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setDesignStyle(s.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        designStyle === s.id
                          ? "bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500/20"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <div className="text-xs font-black">{s.id}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Design Studio Brief &amp; Layout Guidance
                </label>
                <textarea
                  rows={3}
                  value={designBrief}
                  onChange={(e) => setDesignBrief(e.target.value)}
                  placeholder="Detail layout requirements, typography preferences, or mandatory security elements..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mandatory Footers / Board Affiliation Text
                </label>
                <input
                  type="text"
                  value={mandatoryContent}
                  onChange={(e) => setMandatoryContent(e.target.value)}
                  placeholder="e.g. Affiliated to CBSE • School Code 10492"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>

              {/* Review Summary Box */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1.5">
                <div className="font-bold text-amber-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" /> Auto-Generated Concepts on Submission
                </div>
                <p className="text-[11px] text-amber-800">
                  Submitting will create the organization record, invite <strong>{adminEmail}</strong> as the school administrator, and generate <strong>3 distinct design variations</strong> ready for side-by-side comparison.
                </p>
              </div>

              {createdResult ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Organization Registered &amp; Design Suite Created!</span>
                  </div>
                  <p className="text-xs">
                    Invitation link sent to <strong>{createdResult?.email || adminEmail}</strong>.
                  </p>
                  <div className="pt-2 flex gap-3">
                    <Button
                      onClick={() => router.push(`/vendor/organizations`)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                    >
                      Go to Client Organizations
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/vendor/ai-studio`)}
                      className="text-xs text-slate-700 border-emerald-300"
                    >
                      View in Design Studio
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="pt-2 flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(3)}
                    className="text-xs font-semibold text-slate-700 border-slate-200"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Previous
                  </Button>
                  <Button
                    type="button"
                    disabled={submitting}
                    onClick={handleCompleteOnboarding}
                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs cursor-pointer shadow-md"
                  >
                    {submitting ? "Registering & Creating Suite..." : "Complete Onboarding & Generate Concepts"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sticky 3D Card Live Preview (5 cols) */}
        <div className="lg:col-span-5 sticky top-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col items-center">
          <div className="w-full flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider">
                Live Interactive Simulation
              </span>
              <h3 className="text-xs font-bold text-slate-800">Real-time 3D PVC Preview</h3>
            </div>
            <Badge variant="warning" className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
              {orientation.toUpperCase()}
            </Badge>
          </div>

          <div className="py-4 w-full flex items-center justify-center">
            <Card3DViewer
              student={previewStudent}
              template={previewTemplate}
              size="md"
              showControls={true}
              interactiveTilt={true}
            />
          </div>

          <div className="w-full mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span className="font-semibold text-slate-700">Institution:</span>
              <span className="text-slate-900 font-bold truncate max-w-[150px]">{name || "Not entered"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-700">Primary Color:</span>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: primaryColor }} />
                <span className="font-mono text-slate-800 uppercase">{primaryColor}</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-700">Academic Year:</span>
              <span className="text-slate-800 font-medium">{academicYear}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-700">Surface Mode:</span>
              <span className="text-slate-800 font-medium">{hasBackSide ? "Front & Back" : "Single Side"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
