"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Rendert eine PDF-Vorschau clientseitig über pdf.js auf <canvas>-Elemente statt über ein
 * <iframe>. Viele mobile Browser (v.a. iOS) zeigen PDFs in Iframes nicht nativ an - Canvas-
 * Rendering funktioniert dagegen einheitlich auf Desktop und Mobilgeräten.
 */
export function PdfPreview({ url, label }: { url: string; label: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

        const pdf = await pdfjsLib.getDocument({ url }).promise;
        if (cancelled || !containerRef.current) return;

        containerRef.current.innerHTML = "";
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.4 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.style.display = "block";
          canvas.style.marginBottom = "12px";
          canvas.style.borderRadius = "6px";
          canvas.style.border = "1px solid #e5e5e5";

          await page.render({ canvas, viewport }).promise;
          if (cancelled) return;
          containerRef.current?.appendChild(canvas);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    void render();
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (failed) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-400 underline">
        {label}
      </a>
    );
  }

  return (
    <div
      ref={containerRef}
      className="max-h-[70vh] overflow-y-auto rounded-lg bg-white p-2"
      aria-label={label}
    />
  );
}
