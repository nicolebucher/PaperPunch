"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/language-context";

// Simuliert Fortschritt, da die KI-Antwort nicht gestreamt wird und daher kein echter
// Prozentwert verfügbar ist - nähert sich asymptotisch 92% an, springt bei Erfolg auf 100%,
// sobald die Komponente durch das Ergebnis ersetzt wird.
export function LoadingState({ title }: { title?: string } = {}) {
  const { t } = useLanguage();
  const [progress, setProgress] = useState(4);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 92) return p;
        const remaining = 92 - p;
        return p + Math.max(0.4, remaining * 0.04);
      });
    }, 300);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-zinc-700 border-t-brand-400" />
      <p className="text-lg font-medium">{title ?? t.loading.title}</p>
      <p className="mb-4 text-sm text-zinc-400">{t.loading.subtitle}</p>
      <div className="h-1.5 w-64 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-brand-400 transition-[width] duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
