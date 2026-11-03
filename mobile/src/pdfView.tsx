import { useEffect, useRef, useState } from "react";
import workerSrc from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

/**
 * Zeigt das echte PDF (alle Seiten) in der App an. pdf.js wird erst beim Öffnen geladen,
 * damit der Start der App nicht langsamer wird. Legacy-Build, damit auch ältere Android-WebViews mitkommen.
 */
export function PdfPages({ base64, onPages, errorText }: { base64: string; onPages?: (n: number) => void; errorText: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    let destroy: (() => void) | undefined;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
        const bin = atob(base64);
        const data = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
        const task = pdfjs.getDocument({ data });
        destroy = () => void task.destroy();
        const doc = await task.promise;
        if (cancelled || !box.current) return;
        onPages?.(doc.numPages);
        const el = box.current;
        el.innerHTML = "";
        const cssWidth = el.clientWidth;
        const ratio = Math.min(window.devicePixelRatio || 1, 3);
        for (let n = 1; n <= doc.numPages; n++) {
          const page = await doc.getPage(n);
          if (cancelled) return;
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: (cssWidth / base.width) * ratio });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.className = "pdf-page";
          canvas.setAttribute("aria-label", `${n} / ${doc.numPages}`);
          el.appendChild(canvas);
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("no canvas");
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
          if (n === 1 && !cancelled) setState("ready");
        }
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [base64, onPages]);

  return (
    <div className="pdf-view">
      {state === "loading" && <div className="busy-spinner pdf-spinner" aria-hidden="true" />}
      {state === "error" && <p className="pdf-error">{errorText}</p>}
      <div ref={box} className="pdf-pages" />
    </div>
  );
}
