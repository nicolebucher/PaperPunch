"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Misst anonym Besuchsdauer und Absprünge (eine Seite = Absprung) fürs Kosten-Dashboard.
// Keine Kennung, kein Cookie, nichts im Browser gespeichert: Zähler nur im Arbeitsspeicher, beim ersten
// Verlassen/Verstecken des Tabs einmal an /api/visit-stat. Gezählt wird nur die Zeit, in der der Tab sichtbar ist.
export function VisitBeacon() {
  const pathname = usePathname();
  const pages = useRef(new Set<string>());
  const visibleSince = useRef<number | null>(null);
  const activeMs = useRef(0);
  const sent = useRef(false);

  useEffect(() => {
    if (pathname) pages.current.add(pathname);
  }, [pathname]);

  useEffect(() => {
    if (document.visibilityState === "visible") visibleSince.current = Date.now();
    const flush = () => {
      if (visibleSince.current !== null) activeMs.current += Date.now() - visibleSince.current;
      visibleSince.current = null;
      if (sent.current) return;
      sent.current = true;
      const body = JSON.stringify({ src: "web", pages: Math.max(1, pages.current.size), seconds: Math.round(activeMs.current / 1000) });
      try {
        if (!navigator.sendBeacon?.("/api/visit-stat", body)) {
          void fetch("/api/visit-stat", { method: "POST", body, keepalive: true });
        }
      } catch {
        /* egal */
      }
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") flush();
      else if (!sent.current) visibleSince.current = Date.now();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", flush);
    };
  }, []);

  return null;
}
