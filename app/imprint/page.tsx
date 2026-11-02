"use client";

import type { ReactNode } from "react";
import { useLanguage } from "@/lib/i18n/language-context";

function DraftNotice({ children }: { children: ReactNode }) {
  return <p className="mb-6 rounded-lg bg-brand-400/10 p-4 text-sm text-brand-300">{children}</p>;
}

function ImprintEn() {
  return (
    <>
      <h1 className="mb-2 text-2xl font-bold">Imprint</h1>
      <DraftNotice>
        This is a draft template, not legal advice. Replace the bracketed placeholders with your actual details
        and have it reviewed before publishing (requirements vary by country).
      </DraftNotice>
      <div className="flex flex-col gap-6 text-sm leading-relaxed text-zinc-300">
        <section>
          <h2 className="mb-1 font-semibold text-white">Service provider</h2>
          <p>[Your name or company name]</p>
          <p>[Street address]</p>
          <p>[Postal code, city, country]</p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">Contact</h2>
          <p>Email: [your@email.example]</p>
          <p>Phone: [optional]</p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">Responsible for content</h2>
          <p>[Name and address of the person responsible, if required in your jurisdiction]</p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">AI-generated content</h2>
          <p>
            Worksheets, tests, and learning games on this site are generated automatically using AI based on the
            material you upload. Please review generated content for accuracy before relying on it.
          </p>
        </section>
      </div>
    </>
  );
}

function ImprintDe() {
  return (
    <>
      <h1 className="mb-2 text-2xl font-bold">Impressum</h1>
      <DraftNotice>
        Dies ist eine Vorlage, keine Rechtsberatung. Ersetze die Platzhalter durch deine tatsächlichen Angaben
        und lasse den Text vor Veröffentlichung rechtlich prüfen (Angaben nach § 5 TMG / § 5 DDG).
      </DraftNotice>
      <div className="flex flex-col gap-6 text-sm leading-relaxed text-zinc-300">
        <section>
          <h2 className="mb-1 font-semibold text-white">Diensteanbieter</h2>
          <p>[Name oder Firma]</p>
          <p>[Straße, Hausnummer]</p>
          <p>[PLZ, Ort, Land]</p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">Kontakt</h2>
          <p>E-Mail: [deine@email.de]</p>
          <p>Telefon: [optional]</p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
          <p>[Name und Anschrift der verantwortlichen Person]</p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">Hinweis zu KI-generierten Inhalten</h2>
          <p>
            Arbeitsblätter, Testarbeiten und Lernspiele auf dieser Seite werden automatisiert per KI aus deinem
            hochgeladenen Material erstellt. Bitte prüfe die erzeugten Inhalte vor Gebrauch auf Richtigkeit.
          </p>
        </section>
      </div>
    </>
  );
}

export default function ImprintPage() {
  const { locale } = useLanguage();
  return <main className="mx-auto max-w-2xl flex-1 px-4 py-16">{locale === "de" ? <ImprintDe /> : <ImprintEn />}</main>;
}
