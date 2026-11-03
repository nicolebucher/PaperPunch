import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

// Grenzen wie auf der Website: 8 Dateien, zusammen 4 MB (Vercel nimmt pro Anfrage ~4,5 MB an).
// Fotos werden vorher auf ~1400 px verkleinert (je ca. 200–400 KB), PDFs zählen mit voller Größe.
export const MAX_FILES = 8;
export const MAX_BYTES = 4 * 1024 * 1024;

export type FileError = "type" | "count" | "size";

const ALLOWED = ["image/jpeg", "image/png", "application/pdf"];

export function kindOf(file: File): "JPG" | "PNG" | "PDF" | null {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "PDF";
  if (file.type === "image/png" || name.endsWith(".png")) return "PNG";
  if (file.type === "image/jpeg" || /\.jpe?g$/.test(name)) return "JPG";
  return null;
}

export const totalBytes = (files: File[]) => files.reduce((s, f) => s + f.size, 0);

export function formatMb(bytes: number, lang: "de" | "en"): string {
  const mb = (bytes / 1024 / 1024).toFixed(1);
  return lang === "de" ? mb.replace(".", ",") : mb;
}

/** Shrinks a photo to max 1400 px on the long side as JPEG, so eight pages fit under 4 MB (text stays readable). */
async function compressImage(file: File): Promise<File> {
  if (file.size < 350 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.75));
    canvas.width = 0; // Speicher freigeben (wichtig bei vielen großen Handyfotos)
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.(png|jpe?g)$/i, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/** Adds files to the list, respecting type, count and size limits. Returns the new list and the first error. */
export async function addFiles(
  current: File[],
  incoming: File[],
  onProgress?: (done: number, total: number) => void
): Promise<{ files: File[]; error?: FileError }> {
  const files = current.slice();
  let error: FileError | undefined;
  let done = 0;
  onProgress?.(0, incoming.length);
  for (const raw of incoming) {
    onProgress?.(done++, incoming.length);
    const kind = kindOf(raw);
    if (!kind) {
      error ??= "type";
      continue;
    }
    if (files.length >= MAX_FILES) {
      error ??= "count";
      continue;
    }
    // Manche Android-Dateiauswahlen liefern keinen MIME-Typ – dann aus der Endung setzen.
    const typed = ALLOWED.includes(raw.type)
      ? raw
      : new File([raw], raw.name, { type: kind === "PDF" ? "application/pdf" : kind === "PNG" ? "image/png" : "image/jpeg" });
    const file = kind === "PDF" ? typed : await compressImage(typed);
    if (totalBytes(files) + file.size > MAX_BYTES) {
      error ??= "size";
      continue;
    }
    files.push(file);
  }
  onProgress?.(incoming.length, incoming.length);
  return { files, error };
}

function dataUrlToFile(dataUrl: string, name: string): File {
  const [head, data] = dataUrl.split(",");
  const type = head.match(/data:(.*?);/)?.[1] ?? "image/jpeg";
  const bin = atob(data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], name, { type });
}

export const isNative = () => Capacitor.isNativePlatform();

/**
 * Opens the native camera on Android. Returns null when the user cancels.
 * In the browser the caller uses a file input with capture="environment" instead.
 */
export async function takeNativePhoto(index: number): Promise<File | null> {
  try {
    const photo = await Camera.getPhoto({
      source: CameraSource.Camera,
      resultType: CameraResultType.DataUrl,
      quality: 80,
      width: 1400,
      correctOrientation: true,
      saveToGallery: false,
    });
    return photo.dataUrl ? dataUrlToFile(photo.dataUrl, `Seite-${index}.jpg`) : null;
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("cancel")) return null;
    throw error;
  }
}
