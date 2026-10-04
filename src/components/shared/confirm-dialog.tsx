"use client";

import { useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  trigger: ReactNode;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void | Promise<void>;
}

/**
 * Dialog konfirmasi ringan tanpa dependensi tambahan.
 * Fokus: destructive action (hapus/arsip/batal). Esc & backdrop menutup.
 */
export function ConfirmDialog({
  trigger,
  title = "Hapus data?",
  description = "Tindakan ini tidak dapat dibatalkan. Pastikan Anda yakin sebelum melanjutkan.",
  confirmLabel = "Hapus",
  cancelLabel = "Batal",
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm?.();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <span onClick={() => setOpen(true)} className="inline-flex">
        {trigger}
      </span>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-[2px]"
          role="presentation"
          onClick={() => !busy && setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && !busy) setOpen(false);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-desc"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <AlertTriangle className="size-5" aria-hidden />
            </span>
            <h2 id="confirm-title" className="text-lg font-semibold text-slate-900">
              {title}
            </h2>
            <p id="confirm-desc" className="mt-1 text-sm leading-relaxed text-slate-600">
              {description}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                {cancelLabel}
              </Button>
              <Button variant="destructive" onClick={handleConfirm} disabled={busy}>
                {busy ? "Memproses…" : confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
