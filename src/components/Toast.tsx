"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Toast = { id: number; message: string; type: "success" | "error" };
type ToastCtx = { success: (msg: string) => void; error: (msg: string) => void };

const Ctx = createContext<ToastCtx>({ success: () => {}, error: () => {} });
export const useToast = () => useContext(Ctx);

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((message: string, type: "success" | "error") => {
    const id = nextId++;
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
  }, []);

  const success = useCallback((msg: string) => add(msg, "success"), [add]);
  const error = useCallback((msg: string) => add(msg, "error"), [add]);
  const dismiss = useCallback((id: number) => setToasts((p) => p.filter((t) => t.id !== id)), []);

  return (
    <Ctx.Provider value={{ success, error }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] space-y-2" style={{ pointerEvents: "none" }}>
        {toasts.map((t) => (
          <div key={t.id}
            className={cn("flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-[toast-in_0.3s_ease-out]",
              t.type === "success" ? "bg-white text-emerald-700 border border-emerald-200" : "bg-white text-red-600 border border-red-200"
            )}
            style={{ pointerEvents: "auto" }}>
            {t.type === "success" ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> : <AlertTriangle size={16} className="text-red-500 shrink-0" />}
            <span>{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="ml-2 text-[#9ca3af] hover:text-[#6b7280] cursor-pointer shrink-0"><X size={14} /></button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
