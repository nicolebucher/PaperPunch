import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Die zwei React-Compiler-Regeln melden hier bewusste Muster, keine Fehler (geprüft im Security-Review L7):
    // - set-state-in-effect: localStorage/URL-Hash wird erst nach dem Mount gelesen, weil es beim Server-Rendern
    //   nicht existiert (sonst Hydration-Fehler).
    // - purity: Date.now() steht nur in Event-Handlern (Start, Abschicken, Speichern), nicht im Rendern selbst.
    // Als Warnung bleiben sie sichtbar, brechen aber CI nicht.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Android-App mit eigenem Build (eigenes Vercel-Projekt, Startordner mobile/).
    "mobile/**",
  ]),
]);

export default eslintConfig;
