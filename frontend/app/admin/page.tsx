"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/production");
  }, [router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
      <div className="w-9 h-9 border-4 border-[#15803D] border-t-transparent rounded-full animate-spin" />
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Routing to Admin Console...</p>
    </div>
  );
}
