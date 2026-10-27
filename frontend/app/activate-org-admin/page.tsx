"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { 
  Building, 
  AlertCircle, 
  CheckCircle2, 
  KeyRound, 
  ShieldCheck, 
  User, 
  ArrowRight 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

function ActivateOrgAdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No activation token provided. Please check the invitation link.");
      setLoading(false);
      return;
    }

    api.getInvitationDetails(token)
      .then((data) => {
        setInvitation(data);
        setUsername(data.email.split("@")[0] + "_admin");
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Invalid or expired invitation token.");
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      await api.activateOrgAdmin({
        token,
        full_name: fullName,
        username,
        password
      });
      router.push("/organization/students");
    } catch (err: any) {
      setError(err.message || "Failed to activate organization administrator account.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3 max-w-md mx-auto">
        <Skeleton className="h-12 w-12 rounded-full mx-auto" />
        <Skeleton className="h-6 w-3/4 mx-auto" />
        <Skeleton className="h-4 w-1/2 mx-auto" />
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <Card className="p-8 max-w-md mx-auto text-center space-y-4 shadow-sm">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <CardTitle className="text-base font-bold text-foreground">Invalid Invitation</CardTitle>
        <CardDescription className="text-xs text-rose-600">{error}</CardDescription>
        <Button asChild size="sm" variant="outline" className="mt-2">
          <Link href="/login">Return to Sign In</Link>
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-8 max-w-md w-full mx-auto shadow-xl space-y-6">
      <div className="text-center space-y-1">
        <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-2 text-indigo-600">
          <Building className="w-6 h-6" />
        </div>
        <Badge variant="outline" className="text-[10px] font-mono text-indigo-600 border-indigo-200 uppercase tracking-wider mb-1">
          Institution Access
        </Badge>
        <CardTitle className="text-xl font-bold text-foreground">Activate Organization Admin</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Establish credentials for <strong className="text-indigo-600">{invitation.target_name}</strong>
        </CardDescription>
      </div>

      {error && (
        <div className="p-3 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Full Legal Name *</label>
          <Input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="text-xs"
            placeholder="Dr. Alice Smith"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Account Username *</label>
          <Input
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="text-xs font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Set Password *</label>
          <Input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="text-xs"
            placeholder="Minimum 8 characters"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Confirm Password *</label>
          <Input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="text-xs"
            placeholder="Re-enter password"
          />
        </div>

        <Button
          type="submit"
          disabled={submitting}
          className="w-full font-bold text-xs mt-2"
        >
          {submitting ? "Activating Account..." : "Activate & Enter Workspace"}
        </Button>
      </form>
    </Card>
  );
}

export default function ActivateOrgAdminPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center py-12 px-6">
      <Suspense fallback={
        <div className="py-24 text-center">
          <Skeleton className="h-64 w-80 rounded-2xl" />
        </div>
      }>
        <ActivateOrgAdminContent />
      </Suspense>
    </div>
  );
}
