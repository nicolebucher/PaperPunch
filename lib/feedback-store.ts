import { put } from "@vercel/blob";

// Rückmeldungen (Bewertungen aus App/Web und das Feedback-Formular) gehen an zwei Stellen:
// 1. als Sicherung in einen privaten Vercel Blob Store (Frankfurt) unter feedback/JJJJ-MM-TT/…json – damit nichts verloren geht,
// 2. an das Google Sheet (Apps-Script-Webhook in RATINGS_WEBHOOK_URL), das einmal pro Woche durchgegangen wird.

export type FeedbackKind = "rating" | "feedback" | "report";

export async function storeFeedback(kind: FeedbackKind, row: Record<string, unknown>): Promise<{ stored: boolean }> {
  const record = { kind, submittedAt: new Date().toISOString(), ...row };
  let stored = false;

  // Eigener, PRIVATER Blob Store (paperpunch-feedback-private, Frankfurt) – Feedback kann Name/E-Mail enthalten,
  // deshalb nie in den öffentlichen Store der Challenges/Jobs. Der private Store ist mit dem Projekt verbunden
  // (BLOB_STORE_ID) und meldet sich per OIDC an; der öffentliche Store nutzt BLOB_READ_WRITE_TOKEN explizit.
  const storeId = process.env.BLOB_STORE_ID;
  if (storeId) {
    try {
      const day = record.submittedAt.slice(0, 10);
      await put(`feedback/${day}/${kind}.json`, JSON.stringify(record), {
        access: "private",
        addRandomSuffix: true,
        contentType: "application/json",
        storeId,
      });
      stored = true;
    } catch (error) {
      console.error(`[${kind}] blob failed:`, error instanceof Error ? error.message : error);
    }
  }

  const webhook = process.env.RATINGS_WEBHOOK_URL;
  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
        redirect: "follow",
      });
      if (!res.ok) throw new Error(`webhook ${res.status}`);
      stored = true;
    } catch (error) {
      console.error(`[${kind}] webhook failed:`, error instanceof Error ? error.message : error);
    }
  }

  if (!stored) console.log(`[${kind}]`, JSON.stringify(record));
  return { stored };
}
