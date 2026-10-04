"use client";

import * as React from "react";
import { CheckCircle2, Info, TriangleAlert, OctagonX, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastTone = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

type Listener = (items: ToastItem[]) => void;

const listeners = new Set<Listener>();
let items: ToastItem[] = [];
let nextId = 1;

function emit() {
  for (const l of listeners) l([...items]);
}

function push(tone: ToastTone, message: string) {
  const id = nextId++;
  items = [...items.slice(-3), { id, tone, message }];
  emit();
  window.setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    emit();
  }, 4000);
}

/** API notifikasi custom — pengganti sonner. */
export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),
  warning: (message: string) => push("warning", message),
  info: (message: string) => push("info", message),
};

const TONES: Record<ToastTone, { icon: typeof Info; classes: string }> = {
  success: { icon: CheckCircle2, classes: "text-emerald-600" },
  error: { icon: OctagonX, classes: "text-red-600" },
  warning: { icon: TriangleAlert, classes: "text-amber-600" },
  info: { icon: Info, classes: "text-blue-600" },
};

/** Penampung toast — pasang sekali di root layout. */
export function Toaster() {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  React.useEffect(() => {
    const listener: Listener = (next) => setToasts(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed top-4 right-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
    >
      {toasts.map((t) => {
        const { icon: Icon, classes } = TONES[t.tone];
        return (
          <div
            key={t.id}
            role="status"
            className="animate-toast-in pointer-events-auto flex items-start gap-2.5 rounded-xl border border-slate-100 bg-card p-3.5 text-sm text-slate-800 shadow-lg"
          >
            <Icon className={cn("mt-0.5 size-4 shrink-0", classes)} aria-hidden />
            <p className="min-w-0 flex-1 leading-relaxed">{t.message}</p>
            <button
              type="button"
              aria-label="Tutup notifikasi"
              onClick={() => {
                items = items.filter((x) => x.id !== t.id);
                emit();
              }}
              className="flex size-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}
