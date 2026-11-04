import { put } from "@vercel/blob";

// Rückmeldungen (Bewertungen aus App/Web und das Feedback-Formular) gehen an zwei Stellen:
// 1. als Sicherung in den Vercel Blob Store (Frankfurt) unter feedback/JJJJ-MM-TT/…json – damit nichts verloren geht,
// 2. an das Google Sheet (Apps-Script-Webhook in RATINGS_WEBHOOK_URL), das einmal pro Woche durchgegangen wird.

export type FeedbackKind = "rating" | "feedback";

export async function storeFeedback(kind: FeedbackKind, row: Record<string, unknown>): Promise<{ stored: boolean }> {
  const record = { kind, submittedAt: new Date().toISOString(), ...row };
  let stored = false;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const day = record.submittedAt.slice(0, 10);
      await put(`feedback/${day}/${kind}.json`, JSON.stringify(record), {
        access: "public",
        addRandomSuffix: true,
        contentType: "application/json",
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
