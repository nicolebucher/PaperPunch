# PaperPunch – Lernmaterial-Generator

Schüler laden Lernmaterial (PDF, JPG oder PNG) hoch, geben Alter/Klasse/Schulart an und lassen sich per KI
ein Arbeitsblatt, eine Testarbeit oder ein Lernspiel mit Leveln daraus erstellen.

## Setup

```bash
npm install
```

`.env.local` existiert bereits mit `AI_MOCK=true` — damit läuft der komplette Flow sofort mit
Beispieldaten, ganz ohne API-Key.

```bash
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000).

## Echte KI-Generierung aktivieren

1. API-Key unter [console.anthropic.com](https://console.anthropic.com) anlegen.
2. In `.env.local` eintragen: `ANTHROPIC_API_KEY=sk-ant-...`
3. `AI_MOCK=false` setzen (oder die Zeile entfernen).

## Wie es funktioniert

- `app/erstellen` — der Wizard (Profil + Upload → Format wählen → Ergebnis).
- `app/api/generate/route.ts` — nimmt Upload + Profil entgegen, ruft Claude auf, liefert PDF oder Level-JSON zurück.
- Uploads werden **nie** gespeichert: Der Datei-Buffer existiert nur innerhalb der einzelnen Anfrage
  (`lib/files/extract-input.ts`) und wird direkt an Claude weitergegeben.
- `lib/generators/*` — je ein Generator pro Format, nutzt `lib/ai/structured-output.ts` für typsicheres,
  über Zod validiertes JSON von Claude.
- `components/pdf/*` + `lib/pdf/*` — rendern Arbeitsblatt/Testarbeit als PDF (`@react-pdf/renderer`).
- `components/game/*` — festes Quiz-/Adventure-Spieltemplate, das mit den von Claude generierten Leveln gefüttert wird.

## Deployment

Für Vercel: Repository verbinden, `ANTHROPIC_API_KEY` als Environment-Variable setzen, `AI_MOCK` weglassen
oder auf `false` setzen.
