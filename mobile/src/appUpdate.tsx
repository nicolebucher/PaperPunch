import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import { useT } from "./i18n";

// Update-Hinweis beim App-Start über die In-App-Updates von Google Play.
// Natives Plugin: @capawesome/capacitor-app-update (per `npm install` + `npx cap sync android`).
// Wir sprechen es direkt über registerPlugin an – ohne Plugin vorhanden (Browser, alter Build)
// schlägt der Aufruf fehl und der Hinweis bleibt einfach aus.

/** Teil der Plugin-Schnittstelle, den wir nutzen (Android). */
interface AppUpdateInfo {
  currentVersionCode?: string;
  availableVersionCode?: string;
  /** 0 unbekannt · 1 kein Update · 2 Update verfügbar · 3 Update läuft */
  updateAvailability: number;
  flexibleUpdateAllowed?: boolean;
  immediateUpdateAllowed?: boolean;
  /** 11 = heruntergeladen, wartet auf Neustart */
  installStatus?: number;
}
interface FlexibleUpdateState {
  installStatus: number;
  bytesDownloaded?: number;
  totalBytesToDownload?: number;
}
interface AppUpdatePlugin {
  getAppUpdateInfo(): Promise<AppUpdateInfo>;
  startFlexibleUpdate(): Promise<{ code: number }>;
  completeFlexibleUpdate(): Promise<void>;
  openAppStore(): Promise<void>;
  addListener(event: "onFlexibleUpdateStateChange", cb: (state: FlexibleUpdateState) => void): Promise<PluginListenerHandle>;
}

const AppUpdate = registerPlugin<AppUpdatePlugin>("AppUpdate");

const AVAILABLE = 2;
const IN_PROGRESS = 3;
const ST_DOWNLOADING = 2;
const ST_FAILED = 5;
const ST_CANCELED = 6;
const ST_DOWNLOADED = 11;

const SNOOZE_KEY = "pp-update-snooze";
const SNOOZE_DAYS = 3;

function snoozedFor(versionCode: string | undefined): boolean {
  try {
    const raw = localStorage.getItem(SNOOZE_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw) as { until: number; code?: string };
    // eine noch neuere Version zeigen wir trotz "Später" sofort an
    return Date.now() < s.until && (s.code ?? "") === (versionCode ?? "");
  } catch {
    return false;
  }
}

function snooze(versionCode: string | undefined) {
  try {
    localStorage.setItem(SNOOZE_KEY, JSON.stringify({ until: Date.now() + SNOOZE_DAYS * 86400000, code: versionCode ?? "" }));
  } catch {
    /* egal */
  }
}

type Phase = { kind: "hidden" } | { kind: "available"; code?: string } | { kind: "downloading"; pct: number | null } | { kind: "ready" };

/** Kleiner Banner unten: "Neue Version verfügbar" → Laden → "Update bereit – Neu starten". */
export function UpdateBanner({ visible }: { visible: boolean }) {
  const { t } = useT();
  const [phase, setPhase] = useState<Phase>({ kind: "hidden" });
  const listener = useRef<PluginListenerHandle | null>(null);

  const check = useCallback(async () => {
    if (Capacitor.getPlatform() !== "android") return;
    try {
      const info = await AppUpdate.getAppUpdateInfo();
      if (info.installStatus === ST_DOWNLOADED) {
        setPhase({ kind: "ready" });
        return;
      }
      if (info.updateAvailability === IN_PROGRESS) return;
      if (info.updateAvailability !== AVAILABLE) return;
      if (snoozedFor(info.availableVersionCode)) return;
      setPhase((p) => (p.kind === "hidden" ? { kind: "available", code: info.availableVersionCode } : p));
    } catch {
      // nicht aus dem Play Store installiert, Plugin fehlt oder kein Netz → kein Hinweis
    }
  }, []);

  useEffect(() => {
    void check();
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void listener.current?.remove();
    };
  }, [check]);

  async function start() {
    const code = phase.kind === "available" ? phase.code : undefined;
    try {
      const info = await AppUpdate.getAppUpdateInfo();
      if (!info.flexibleUpdateAllowed) {
        // Hintergrund-Update nicht möglich → Store-Seite öffnen
        setPhase({ kind: "hidden" });
        await AppUpdate.openAppStore();
        return;
      }
      if (!listener.current) {
        listener.current = await AppUpdate.addListener("onFlexibleUpdateStateChange", (s) => {
          if (s.installStatus === ST_DOWNLOADED) setPhase({ kind: "ready" });
          else if (s.installStatus === ST_FAILED || s.installStatus === ST_CANCELED) setPhase({ kind: "available", code });
          else if (s.installStatus === ST_DOWNLOADING) {
            const total = s.totalBytesToDownload ?? 0;
            setPhase({ kind: "downloading", pct: total > 0 ? Math.round(((s.bytesDownloaded ?? 0) / total) * 100) : null });
          }
        });
      }
      setPhase({ kind: "downloading", pct: null });
      const res = await AppUpdate.startFlexibleUpdate();
      // 0 = ok (Download läuft), alles andere = abgebrochen/nicht möglich
      if (res.code !== 0) setPhase({ kind: "available", code });
    } catch {
      setPhase({ kind: "hidden" });
      try {
        await AppUpdate.openAppStore();
      } catch {
        /* egal */
      }
    }
  }

  async function restart() {
    try {
      await AppUpdate.completeFlexibleUpdate();
    } catch {
      setPhase({ kind: "hidden" });
    }
  }

  function later() {
    if (phase.kind === "available") snooze(phase.code);
    setPhase({ kind: "hidden" });
  }

  // Nur auf ruhigen Screens (Start, Materialien, Lernplan) – nie mitten im Spiel oder Test
  if (phase.kind === "hidden" || !visible) return null;

  return (
    <div className="update-banner" role="status">
      {phase.kind === "available" && (
        <>
          <div className="update-text">
            <b>{t.updateTitle}</b>
            <span>{t.updateSub}</span>
          </div>
          <div className="update-actions">
            <button type="button" className="update-later" onClick={later}>{t.updateLater}</button>
            <button type="button" className="update-go" onClick={() => void start()}>{t.updateGo}</button>
          </div>
        </>
      )}
      {phase.kind === "downloading" && (
        <div className="update-text">
          <b>{t.updateLoading}{phase.pct !== null ? ` ${phase.pct} %` : " …"}</b>
          <span>{t.updateLoadingSub}</span>
        </div>
      )}
      {phase.kind === "ready" && (
        <>
          <div className="update-text">
            <b>{t.updateReady}</b>
            <span>{t.updateReadySub}</span>
          </div>
          <div className="update-actions">
            <button type="button" className="update-go" onClick={() => void restart()}>{t.updateRestart}</button>
          </div>
        </>
      )}
    </div>
  );
}
