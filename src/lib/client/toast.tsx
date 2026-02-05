"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

type Toast = {
  id: string;
  message: string;
  variant?: "default" | "success" | "error";
};

type ToastContextValue = {
  push: (t: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const value = useMemo<ToastContextValue>(
    () => ({
      push: (t) => {
        const id = `${Date.now()}-${Math.random()}`;
        setToasts((prev) => [...prev, { ...t, id }]);
        window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3500);
      }
    }),
    []
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto max-w-sm rounded border px-3 py-2 text-sm shadow ${
              t.variant === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : t.variant === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-white text-slate-800"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("ToastProvider missing");
  return ctx;
}
