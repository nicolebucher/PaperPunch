import { createHmac, timingSafeEqual } from "node:crypto";

// Rechtschreib-Check, Phase 2 ("followup"): gehört zum Material aus Phase 1 und zählt deshalb nicht extra
// zum Wochen-Kontingent. Damit das kein Schlupfloch für kostenlose Arbeitsblätter ist, bekommt Phase 1 ein
// kurzlebiges, vom Server signiertes Token, das an Gerät bzw. IP gebunden ist. Ohne gültiges Token zählt
// Phase 2 wie ein neues Material.

const TTL_MS = 6 * 60 * 60 * 1000;

function secret(): string | undefined {
  // Eigener Schlüssel, sonst ein ohnehin geheimer Server-Wert (nie an den Browser ausgeliefert)
  return process.env.TOKEN_SECRET || process.env.KV_REST_API_TOKEN || process.env.ANTHROPIC_API_KEY;
}

function sign(subject: string, expires: number, key: string): string {
  return createHmac("sha256", key).update(`pp-followup:${subject}:${expires}`).digest("base64url");
}

export function createFollowupToken(subject: string): string | undefined {
  const key = secret();
  if (!key) return undefined;
  const expires = Date.now() + TTL_MS;
  return `${expires}.${sign(subject, expires, key)}`;
}

export function verifyFollowupToken(token: unknown, subject: string): boolean {
  const key = secret();
  if (!key || typeof token !== "string") return false;
  const [exp, sig] = token.split(".");
  const expires = Number(exp);
  if (!sig || !Number.isFinite(expires) || expires < Date.now() || expires > Date.now() + TTL_MS) return false;
  const expected = Buffer.from(sign(subject, expires, key));
  const given = Buffer.from(sig);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
