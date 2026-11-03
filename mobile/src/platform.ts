import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

export type ShareOutcome = "shared" | "downloaded" | "cancelled";

function base64ToBytes(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

/**
 * Teilt eine Datei mit beliebigen Apps (WhatsApp, Mail, Drive, AirDrop …).
 * Android: Datei in den App-Cache schreiben und das System-Teilen-Menü öffnen.
 * Browser: Web-Share mit Datei, wenn verfügbar, sonst herunterladen.
 */
export async function shareFile(opts: { filename: string; mime: string; title: string; base64?: string; text?: string }): Promise<ShareOutcome> {
  if (Capacitor.isNativePlatform()) {
    const written = opts.base64 !== undefined
      ? await Filesystem.writeFile({ path: opts.filename, data: opts.base64, directory: Directory.Cache })
      : await Filesystem.writeFile({ path: opts.filename, data: opts.text ?? "", directory: Directory.Cache, encoding: Encoding.UTF8 });
    try {
      await Share.share({ title: opts.title, files: [written.uri], dialogTitle: opts.title });
      return "shared";
    } catch {
      return "cancelled";
    }
  }

  const blob = opts.base64 !== undefined
    ? new Blob([base64ToBytes(opts.base64)], { type: opts.mime })
    : new Blob([opts.text ?? ""], { type: opts.mime });
  const file = new File([blob], opts.filename, { type: opts.mime });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (nav.canShare && nav.share && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: opts.title });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = opts.filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return "downloaded";
}

/**
 * Öffnet ein PDF zum Ansehen und Drucken: Android über das Teilen-Menü (dort "Drucken" bzw. PDF-Viewer wählbar),
 * im Browser in neuem Tab, wo der Drucken-Button des PDF-Viewers bereitsteht.
 */
export async function openPdf(base64: string, filename: string, title: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await shareFile({ filename, mime: "application/pdf", title, base64 });
    return;
  }
  const url = URL.createObjectURL(new Blob([base64ToBytes(base64)], { type: "application/pdf" }));
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Mehrere Dateien (z. B. die Fotos vom Schulmaterial) teilen oder herunterladen. */
export async function shareFiles(files: File[], title: string): Promise<ShareOutcome> {
  if (!files.length) return "cancelled";
  if (Capacitor.isNativePlatform()) {
    const uris: string[] = [];
    for (const [i, f] of files.entries()) {
      const name = `${i + 1}-${f.name.replace(/[^\w.-]/g, "_")}`;
      const written = await Filesystem.writeFile({ path: name, data: await blobToBase64(f), directory: Directory.Cache });
      uris.push(written.uri);
    }
    try {
      await Share.share({ title, files: uris, dialogTitle: title });
      return "shared";
    } catch {
      return "cancelled";
    }
  }
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (nav.canShare && nav.share && nav.canShare({ files })) {
    try {
      await nav.share({ files, title });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }
  for (const f of files) {
    const url = URL.createObjectURL(f);
    const link = document.createElement("a");
    link.href = url;
    link.download = f.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
  return "downloaded";
}
