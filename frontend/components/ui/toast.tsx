"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface Toast {
  id: string;
  title?: string;
  description: string;
  variant?: "default" | "success" | "error" | "warning";
}

interface ToastContextType {
  toast: (toast: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(({ title, description, variant = "default" }: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, variant }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto p-4 rounded-xl border shadow-xl animate-fade-in text-xs font-semibold space-y-1 transition-all",
              t.variant === "success" && "bg-emerald-950/90 text-emerald-200 border-emerald-500/30",
              t.variant === "error" && "bg-rose-950/90 text-rose-200 border-rose-500/30",
              t.variant === "warning" && "bg-amber-950/90 text-amber-200 border-amber-500/30",
              t.variant === "default" && "bg-slate-900/90 text-white border-slate-700"
            )}
          >
            {t.title && <div className="font-black text-sm">{t.title}</div>}
            <div className="text-slate-300">{t.description}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      toast: ({ description }: { description: string }) => {
        alert(description);
      }
    };
  }
  return context;
};
