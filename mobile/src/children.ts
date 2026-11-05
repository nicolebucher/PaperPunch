import type { Child, Profile } from "./types";

// Mehrere Kinder für Eltern: jedes Kind hat Schulart und Klasse (Name optional, bleibt auf dem Handy).
// profile.schoolType/grade spiegeln immer das gerade gewählte Kind – so funktioniert der Rest der App unverändert.
// Punches, Level und Lernpläne sind (vorerst) gemeinsam fürs Gerät.

export const MAX_CHILDREN = 5;

export const isParent = (p: Profile | null | undefined) => p?.role === "parent";

export function newChildId(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Kinderliste eines Elternprofils (legt das erste Kind aus Schulart/Klasse an, falls noch keins da ist). */
export function kidsOf(p: Profile): Child[] {
  if (p.children?.length) return p.children;
  return [{ id: p.childId ?? "c1", name: "", schoolType: p.schoolType, grade: p.grade }];
}

export function activeChild(p: Profile): Child | undefined {
  if (!isParent(p)) return undefined;
  const kids = kidsOf(p);
  return kids.find((k) => k.id === p.childId) ?? kids[0];
}

/** Schulart/Klasse des Profils ins gewählte Kind übernehmen (z. B. nach Änderung im Erstellen-Screen). */
export function syncActive(p: Profile): Profile {
  if (!isParent(p)) return p;
  const kids = kidsOf(p);
  const id = p.childId && kids.some((k) => k.id === p.childId) ? p.childId : kids[0].id;
  return { ...p, childId: id, children: kids.map((k) => (k.id === id ? { ...k, schoolType: p.schoolType, grade: p.grade } : k)) };
}

/** Kind auswählen: Schulart/Klasse des Profils auf dieses Kind stellen. */
export function selectChild(p: Profile, id: string): Profile {
  const kid = kidsOf(p).find((k) => k.id === id);
  return kid ? { ...p, children: kidsOf(p), childId: id, schoolType: kid.schoolType, grade: kid.grade } : p;
}

/** Kinderliste setzen; das gewählte Kind bleibt (oder das erste), Profil-Schulart/Klasse folgen ihm. */
export function setKids(p: Profile, kids: Child[]): Profile {
  const list = kids.length ? kids.slice(0, MAX_CHILDREN) : kidsOf(p).slice(0, 1);
  const active = list.find((k) => k.id === p.childId) ?? list[0];
  return { ...p, children: list, childId: active.id, schoolType: active.schoolType, grade: active.grade };
}

/** Anzeige: Name oder "Kind 2", dazu die Klasse. */
export function childLabel(kid: Child, index: number, fallback: (n: number) => string): string {
  return kid.name.trim() || fallback(index + 1);
}

export const kidsComplete = (p: Profile) => kidsOf(p).every((k) => !!k.schoolType && k.grade > 0);
