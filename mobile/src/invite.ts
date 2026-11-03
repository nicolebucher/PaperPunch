import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";

// "Freunde einladen": jeder bekommt einen eigenen Code im Link. Heute zählt die App nur auf dem Gerät,
// wie oft geteilt wurde; später kann der Server über ?ref=CODE echte Anmeldungen zuordnen (Growth-Motor).

const KEY = "paperpunch-invite";
// Sobald paper-punch.com live ist, hier umstellen.
export const INVITE_BASE = "https://snap-it-new.vercel.app";

interface InviteState {
  code: string;
  shares: number;
}

function load(): InviteState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as InviteState;
  } catch {
    // ignorieren
  }
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  const state = { code, shares: 0 };
  save(state);
  return state;
}

function save(state: InviteState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignorieren
  }
}

export const inviteCode = () => load().code;
export const inviteLink = () => `${INVITE_BASE}/?ref=${inviteCode()}`;
export const inviteShares = () => load().shares;

export type InviteOutcome = "shared" | "copied" | "cancelled";

/** Öffnet das Teilen-Menü (WhatsApp, Insta, SMS …) mit Einladungstext und persönlichem Link. */
export async function shareInvite(title: string, text: string): Promise<InviteOutcome> {
  const url = inviteLink();
  let outcome: InviteOutcome = "cancelled";
  try {
    if (Capacitor.isNativePlatform()) {
      await Share.share({ title, text, url, dialogTitle: title });
      outcome = "shared";
    } else if (navigator.share) {
      await navigator.share({ title, text, url });
      outcome = "shared";
    } else {
      await navigator.clipboard.writeText(`${text} ${url}`);
      outcome = "copied";
    }
  } catch {
    outcome = "cancelled";
  }
  if (outcome !== "cancelled") {
    const state = load();
    save({ ...state, shares: state.shares + 1 });
  }
  return outcome;
}
