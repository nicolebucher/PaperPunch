# PaperPunch – Android-App

Eigene Oberfläche für das Handy (Kamera zuerst, nach Prototyp D) plus Lernplan. Die App hat keine eigene
KI-Schnittstelle: Sie ruft `/api/generate` und `/api/plan` der Website (Hauptordner dieses Repos) auf.

- **Web-Vorschau:** eigenes Vercel-Projekt mit Startordner `mobile/` – zum Testen im Browser und zum Teilen.
- **Android:** dieselbe Oberfläche, mit Capacitor als App verpackt. Kamera, Teilen und Dateien laufen nativ.

## Aufbau

| Ordner/Datei | Inhalt |
|---|---|
| `src/screens/` | Bildschirme: Einrichtung, Start, Kamera, Laden, Ergebnis, Quiz, Lernplan |
| `src/countries.ts` | Länder mit Schularten, Klassen und Notenskalen |
| `src/i18n.tsx` | Texte Deutsch/Englisch |
| `src/api.ts` | Aufrufe der Website-API |
| `src/storage.ts` | Profil und Lernplan nur auf dem Gerät (localStorage, IndexedDB) |
| `capacitor.config.ts` | App-ID `com.paperpunch.app`, Name „PaperPunch“ |

## Lokal starten (Browser)

```bash
cd mobile
npm install
cp .env.example .env.local   # VITE_API_BASE zeigt auf die Website
npm run dev
```

Läuft die Website lokal mit `AI_MOCK=true`, setze `VITE_API_BASE=http://localhost:3000` – dann funktioniert alles
ohne API-Key mit Beispieldaten.

## Android-App bauen

Einmalig: [Android Studio](https://developer.android.com/studio) installieren.

```bash
cd mobile
npm install
npm run build
npx cap add android        # nur beim ersten Mal, legt den Ordner android/ an
npx cap sync android
npx cap open android       # öffnet Android Studio
```

In Android Studio: oben das Handy oder den Emulator wählen und auf ▶ drücken.

Nach dem ersten `cap add android` die Kamera-Berechtigung in `android/app/src/main/AndroidManifest.xml`
ergänzen (innerhalb von `<manifest>`):

```xml
<uses-permission android:name="android.permission.CAMERA" />
```

Danach bei jeder Änderung: `npm run android` (baut, synchronisiert, öffnet Android Studio).

## Für den Play Store

1. Google-Play-Entwicklerkonto anlegen (einmalig 25 $).
2. In Android Studio: **Build → Generate Signed App Bundle** → `.aab`-Datei erzeugen. Den Signaturschlüssel sicher
   aufbewahren, ohne ihn gibt es keine Updates.
3. In der Play Console: App anlegen, Zielgruppe 13–17 angeben, Datenschutzerklärung verlinken
   (`https://paper-punch.com/privacy`), Fragebogen zu Werbung und Datensicherheit ausfüllen.

## Wichtig für die Website (API)

Die API erlaubt Aufrufe der App über CORS (`lib/cors.ts`): Capacitor-Origins sind fest eingetragen, weitere
Domains (z. B. die Web-Vorschau der App) über die Umgebungsvariable `APP_ALLOWED_ORIGINS` im Vercel-Projekt
der Website.
