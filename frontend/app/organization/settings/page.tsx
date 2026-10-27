"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  Building2, 
  Palette, 
  Users, 
  UploadCloud, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Plus, 
  X, 
  Globe, 
  MapPin,
  Settings,
  Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  const [org, setOrg] = useState<any>(null);
  const [branding, setBranding] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Staff members list
  const [staff, setStaff] = useState<any[]>([]);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [staffForm, setStaffForm] = useState({
    full_name: "",
    email: "",
    username: "",
    phone: "",
    password: "",
    role_name: "DATA_ENTRY_STAFF"
  });

  // Org Form
  const [orgForm, setOrgForm] = useState({
    name: "",
    short_name: "",
    org_type: "School",
    reg_number: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
    website: ""
  });

  // Branding Form
  const [brandingForm, setBrandingForm] = useState({
    primary_color: "#1e3a8a",
    secondary_color: "#f59e0b",
    text_color: "#1f2937"
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const o = await api.getOrganization();
      setOrg(o);
      setOrgForm({
        name: o.name,
        short_name: o.short_name || "",
        org_type: o.org_type,
        reg_number: o.reg_number || "",
        address: o.address || "",
        city: o.city || "",
        state: o.state || "",
        country: o.country || "India",
        pincode: o.pincode || "",
        website: o.website || ""
      });

      const b = await api.getBranding();
      setBranding(b);
      setBrandingForm({
        primary_color: b.primary_color,
        secondary_color: b.secondary_color,
        text_color: b.text_color
      });

      try {
        const staffData = await api.getStaff();
        setStaff(staffData || []);
      } catch (err) {
        console.error("Staff listing not allowed/supported: ", err);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await api.updateOrganization(orgForm);
      setSuccess("Organization details updated successfully!");
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to update details.");
    }
  };

  const handleBrandingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await api.updateBranding(brandingForm);
      setSuccess("Branding colors updated successfully!");
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to update branding colors.");
    }
  };

  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await api.createStaff(staffForm);
      setSuccess("Staff member added successfully!");
      setStaffForm({
        full_name: "",
        email: "",
        username: "",
        phone: "",
        password: "",
        role_name: "DATA_ENTRY_STAFF"
      });
      setShowAddStaff(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to add staff member.");
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm("Are you sure you want to remove this staff user?")) return;
    setError("");
    setSuccess("");
    try {
      await api.deleteStaff(id);
      setSuccess("Staff member removed successfully.");
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to remove staff user.");
    }
  };

  const handleLogoUpload = async (logoType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await api.uploadLogo(logoType, file);
      setSuccess(`${logoType.charAt(0).toUpperCase() + logoType.slice(1)} logo asset uploaded successfully!`);
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to upload logo file.");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-12 space-y-6">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workspace Configuration</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight mt-1">Organization Profile & Brand Kit</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Manage institutional metadata, official brand colors, vector logo assets, and granular staff access controls.
        </p>
      </div>

      {error && (
        <div className="p-3 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6 items-start">
        {/* Left Forms Pane */}
        <div className="md:col-span-2 space-y-6">
          {/* Organization Details Form */}
          <Card>
            <CardHeader className="pb-4 border-b border-border">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" /> Institutional Metadata
              </CardTitle>
              <CardDescription className="text-xs">
                Official details rendered on dynamic card headers and QR back verification pages.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4">
              <form onSubmit={handleOrgSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                    Institution Name *
                  </label>
                  <Input 
                    type="text" 
                    required
                    value={orgForm.name}
                    onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                    className="text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                      Short Name / Acronym
                    </label>
                    <Input 
                      type="text" 
                      value={orgForm.short_name}
                      onChange={(e) => setOrgForm({ ...orgForm, short_name: e.target.value })}
                      className="text-xs"
                      placeholder="E.g. DPS-DEL"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                      Registration ID
                    </label>
                    <Input 
                      type="text" 
                      value={orgForm.reg_number}
                      onChange={(e) => setOrgForm({ ...orgForm, reg_number: e.target.value })}
                      className="text-xs"
                      placeholder="Board affiliation number"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                    Official Website
                  </label>
                  <Input 
                    type="text" 
                    value={orgForm.website}
                    onChange={(e) => setOrgForm({ ...orgForm, website: e.target.value })}
                    className="text-xs"
                    placeholder="https://school.edu"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                    Campus Address
                  </label>
                  <Textarea 
                    value={orgForm.address}
                    rows={2}
                    onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })}
                    className="text-xs"
                    placeholder="Full postal address..."
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">City</label>
                    <Input 
                      type="text" 
                      value={orgForm.city}
                      onChange={(e) => setOrgForm({ ...orgForm, city: e.target.value })}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">State</label>
                    <Input 
                      type="text" 
                      value={orgForm.state}
                      onChange={(e) => setOrgForm({ ...orgForm, state: e.target.value })}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Pincode</label>
                    <Input 
                      type="text" 
                      value={orgForm.pincode}
                      onChange={(e) => setOrgForm({ ...orgForm, pincode: e.target.value })}
                      className="text-xs"
                    />
                  </div>
                </div>

                <Button type="submit" className="font-semibold text-xs">
                  Save Institutional Details
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Branding Colors Form */}
          <Card>
            <CardHeader className="pb-4 border-b border-border">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" /> Brand Palette Colors
              </CardTitle>
              <CardDescription className="text-xs">
                Auto-injected into card designer canvas themes and print layouts.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4">
              <form onSubmit={handleBrandingSubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                      Primary Brand Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={brandingForm.primary_color}
                        onChange={(e) => setBrandingForm({ ...brandingForm, primary_color: e.target.value })}
                        className="w-9 h-9 p-0 border border-input rounded cursor-pointer bg-transparent"
                      />
                      <Input 
                        type="text" 
                        value={brandingForm.primary_color}
                        onChange={(e) => setBrandingForm({ ...brandingForm, primary_color: e.target.value })}
                        className="text-xs font-mono uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                      Accent Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={brandingForm.secondary_color}
                        onChange={(e) => setBrandingForm({ ...brandingForm, secondary_color: e.target.value })}
                        className="w-9 h-9 p-0 border border-input rounded cursor-pointer bg-transparent"
                      />
                      <Input 
                        type="text" 
                        value={brandingForm.secondary_color}
                        onChange={(e) => setBrandingForm({ ...brandingForm, secondary_color: e.target.value })}
                        className="text-xs font-mono uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                      Text Foreground
                    </label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={brandingForm.text_color}
                        onChange={(e) => setBrandingForm({ ...brandingForm, text_color: e.target.value })}
                        className="w-9 h-9 p-0 border border-input rounded cursor-pointer bg-transparent"
                      />
                      <Input 
                        type="text" 
                        value={brandingForm.text_color}
                        onChange={(e) => setBrandingForm({ ...brandingForm, text_color: e.target.value })}
                        className="text-xs font-mono uppercase"
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit" variant="outline" className="font-semibold text-xs">
                  Update Color Palette
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Granular Staff RBAC Section */}
          <Card>
            <CardHeader className="pb-4 border-b border-border">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" /> Staff Accounts & Permissions
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Authorize operators for data entry, design review, or administrative actions.
                  </CardDescription>
                </div>
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddStaff(!showAddStaff)}
                  className="text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  {showAddStaff ? "Cancel" : "Add Staff"}
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {showAddStaff && (
                <form onSubmit={handleAddStaffSubmit} className="p-4 bg-muted/40 border border-border rounded-lg space-y-3">
                  <div className="text-xs font-bold text-foreground">Create Staff Account</div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Full Name *</label>
                      <Input
                        type="text"
                        required
                        value={staffForm.full_name}
                        onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })}
                        className="text-xs"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Email Address *</label>
                      <Input
                        type="email"
                        required
                        value={staffForm.email}
                        onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                        className="text-xs"
                        placeholder="staff@school.edu"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Username *</label>
                      <Input
                        type="text"
                        required
                        value={staffForm.username}
                        onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })}
                        className="text-xs"
                        placeholder="john_staff"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Password *</label>
                      <Input
                        type="password"
                        required
                        value={staffForm.password}
                        onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                        className="text-xs"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Phone Number</label>
                      <Input
                        type="text"
                        value={staffForm.phone}
                        onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                        className="text-xs"
                        placeholder="9876543210"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Role / Permissions</label>
                      <select
                        value={staffForm.role_name}
                        onChange={(e) => setStaffForm({ ...staffForm, role_name: e.target.value })}
                        className="w-full px-2 py-1.5 bg-background border border-input rounded-md text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="STAFF_ADMIN">Staff Admin (Full Access)</option>
                        <option value="DATA_ENTRY_STAFF">Data Entry Staff (Add/Edit Students)</option>
                        <option value="DESIGNER">Designer (Template Customization)</option>
                        <option value="VIEWER">Viewer (Read-Only)</option>
                      </select>
                    </div>
                  </div>

                  <Button type="submit" className="w-full font-bold text-xs">
                    Create Staff Member
                  </Button>
                </form>
              )}

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {staff.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4 font-medium">
                    No additional staff accounts provisioned.
                  </div>
                ) : (
                  staff.map((user) => (
                    <div key={user.id} className="flex justify-between items-center p-3 bg-muted/40 border border-border/50 rounded-lg text-xs">
                      <div>
                        <div className="font-bold text-foreground">
                          {user.full_name} <span className="font-mono text-[11px] text-muted-foreground">(@{user.username})</span>
                        </div>
                        <div className="text-muted-foreground text-[11px]">
                          {user.email} {user.phone ? `• ${user.phone}` : ""}
                        </div>
                        <div className="mt-1 flex gap-1">
                          {user.roles.map((r: string) => (
                            <Badge key={r} variant="outline" className="text-[10px] uppercase font-mono">
                              {r}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteStaff(user.id)}
                        className="text-destructive hover:bg-destructive/10 h-8 w-8"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Upload Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-primary" /> Institutional Logos
              </CardTitle>
              <CardDescription className="text-xs">
                Rendered on dynamic card templates.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 space-y-5">
              {/* Primary Logo */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-muted-foreground uppercase">
                  Primary Crest / Insignia
                </label>
                {branding?.primary_logo ? (
                  <div className="p-3 bg-muted/30 border border-border rounded-lg flex items-center justify-center">
                    <img 
                      src={`http://localhost:8000${branding.primary_logo}`} 
                      alt="Primary logo" 
                      className="max-h-16 max-w-full rounded object-contain"
                    />
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground border border-dashed border-border rounded-lg p-4 text-center">
                    No primary logo uploaded
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleLogoUpload("primary", e)}
                  className="text-xs text-muted-foreground file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90 cursor-pointer w-full"
                />
              </div>

              {/* Secondary Logo */}
              <div className="space-y-2 border-t border-border pt-4">
                <label className="block text-[11px] font-bold text-muted-foreground uppercase">
                  Secondary Graphic / Stamp
                </label>
                {branding?.secondary_logo ? (
                  <div className="p-3 bg-muted/30 border border-border rounded-lg flex items-center justify-center">
                    <img 
                      src={`http://localhost:8000${branding.secondary_logo}`} 
                      alt="Secondary logo" 
                      className="max-h-16 max-w-full rounded object-contain"
                    />
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground border border-dashed border-border rounded-lg p-4 text-center">
                    No secondary asset uploaded
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleLogoUpload("secondary", e)}
                  className="text-xs text-muted-foreground file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90 cursor-pointer w-full"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
