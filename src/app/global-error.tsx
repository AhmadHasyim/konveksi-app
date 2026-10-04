"use client";

import { useEffect } from "react";

interface GlobalErrorShellProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Penangkap error level root (mis. gagal render layout).
 * Minimalis by design: tidak bergantung pada komponen lain.
 */
export default function GlobalErrorShell({ error }: GlobalErrorShellProps) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="id">
      <body>
        <main
          style={{
            minHeight: "100svh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <p>Terjadi kesalahan. Silakan muat ulang halaman.</p>
        </main>
      </body>
    </html>
  );
}
