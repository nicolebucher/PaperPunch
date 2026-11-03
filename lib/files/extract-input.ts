export type ClaudeFileBlock =
  | {
      type: "image";
      source: { type: "base64"; media_type: "image/jpeg" | "image/png"; data: string };
    }
  | {
      type: "document";
      source: { type: "base64"; media_type: "application/pdf"; data: string };
    };

export const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);

// Vercel Serverless Functions cap the request body at ~4.5MB - stay safely under that
// across ALL uploaded files combined (multipart overhead included).
export const MAX_FILES = 8;
export const MAX_TOTAL_SIZE = 4 * 1024 * 1024;

/**
 * Wandelt einen Upload direkt in einen Claude-Content-Block um. Der Buffer/Base64-String
 * lebt ausschließlich innerhalb dieses Funktionsaufrufs und der aufrufenden Request-Invocation -
 * es wird nichts auf die Festplatte oder in eine Datenbank geschrieben.
 */
export async function fileToClaudeBlock(file: File): Promise<ClaudeFileBlock> {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error(
      `Nicht unterstützter Dateityp: ${file.type || "unbekannt"}. Erlaubt sind PDF, JPG und PNG.`
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  if (file.type === "application/pdf") {
    return { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } };
  }

  return {
    type: "image",
    source: { type: "base64", media_type: file.type as "image/jpeg" | "image/png", data: base64 },
  };
}

export async function filesToClaudeBlocks(files: File[]): Promise<ClaudeFileBlock[]> {
  return Promise.all(files.map(fileToClaudeBlock));
}
