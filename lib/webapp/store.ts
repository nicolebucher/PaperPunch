"use client";

import type { GameData, StudyPlan, WorksheetData } from "@/types/generation";

// Web-App unter /app: Materialien und Lernpläne bleiben nur im Browser (localStorage), ohne Konto.
// Podcasts werden wegen der Größe nicht gespeichert. Läuft der Speicher voll, fallen die ältesten weg.

export type WebFormat = "worksheet" | "test" | "game";

export interface WebMaterial {
  id: string;
  createdAt: number;
  format: WebFormat;
  title: string;
  subject?: string;
  sheet?: { data: WorksheetData; pdfBase64: string; filename: string };
  game?: GameData;
}

export interface WebPlan {
  id: string;
  createdAt: number;
  startDate: string; // YYYY-MM-DD
  testDate: string; // YYYY-MM-DD
  subject: string;
  plan: StudyPlan;
  done: number[]; // Indizes erledigter Einheiten
}

const MAT_KEY = "paperpunch-web-materials";
const PLAN_KEY = "paperpunch-web-plans";
const MAX_MATERIALS = 20;

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, list: T[]): void {
  let items = list;
  // Bei vollem Speicher die ältesten Einträge weglassen und erneut versuchen.
  while (items.length) {
    try {
      localStorage.setItem(key, JSON.stringify(items));
      return;
    } catch {
      items = items.slice(0, -1);
    }
  }
  try {
    localStorage.removeItem(key);
  } catch {
    // ignorieren
  }
}

export const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const listMaterials = () => read<WebMaterial>(MAT_KEY).sort((a, b) => b.createdAt - a.createdAt);
export const getMaterial = (id: string) => listMaterials().find((m) => m.id === id);
export function saveMaterial(m: WebMaterial): void {
  write(MAT_KEY, [m, ...listMaterials().filter((x) => x.id !== m.id)].slice(0, MAX_MATERIALS));
}
export function deleteMaterial(id: string): void {
  write(MAT_KEY, listMaterials().filter((m) => m.id !== id));
}

export const listPlans = () => read<WebPlan>(PLAN_KEY).sort((a, b) => a.testDate.localeCompare(b.testDate));
export const getPlan = (id: string) => listPlans().find((p) => p.id === id);
export function savePlan(p: WebPlan): void {
  write(PLAN_KEY, [p, ...listPlans().filter((x) => x.id !== p.id)]);
}
export function deletePlan(id: string): void {
  write(PLAN_KEY, listPlans().filter((p) => p.id !== id));
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function daysBetween(from: string, to: string): number {
  return Math.round((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / 86_400_000);
}
