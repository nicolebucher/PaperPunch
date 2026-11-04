"use client";

import { useLanguage } from "@/lib/i18n/language-context";

function ImprintEn() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Imprint</h1>
      <div className="flex flex-col gap-6 text-sm leading-relaxed text-zinc-300">
        <section>
          <h2 className="mb-1 font-semibold text-white">Service provider</h2>
          <p>Nicole Bucher</p>
          <p>Dorfstraße 64</p>
          <p>01737 Pohrsdorf</p>
          <p>Germany</p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">Contact</h2>
          <p>Email: hello@paper-punch.com</p>
          <p>
            Contact form: <a href="/feedback" className="text-brand-400 underline hover:text-brand-300">paper-punch.com/feedback</a>
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">Responsible for content</h2>
          <p>Nicole Bucher, Dorfstraße 64, 01737 Pohrsdorf, Germany</p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">AI-generated content</h2>
          <p>
            Worksheets, tests, and learning games on this site are generated automatically using AI based on the
            material you upload. Please review generated content for accuracy before relying on it.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">Consumer dispute resolution</h2>
          <p>We are neither willing nor obliged to take part in dispute resolution proceedings before a consumer arbitration board.</p>
        </section>
      </div>
    </>
  );
}

function ImprintDe() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Impressum</h1>
      <div className="flex flex-col gap-6 text-sm leading-relaxed text-zinc-300">
        <section>
          <h2 className="mb-1 font-semibold text-white">Angaben gemäß § 5 DDG</h2>
          <p>Nicole Bucher</p>
          <p>Dorfstraße 64</p>
          <p>01737 Pohrsdorf</p>
          <p>Deutschland</p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">Kontakt</h2>
          <p>E-Mail: hello@paper-punch.com</p>
          <p>
            Kontaktformular: <a href="/feedback" className="text-brand-400 underline hover:text-brand-300">paper-punch.com/feedback</a>
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
          <p>Nicole Bucher, Dorfstraße 64, 01737 Pohrsdorf</p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">Hinweis zu KI-generierten Inhalten</h2>
          <p>
            Arbeitsblätter, Testarbeiten und Lernspiele auf dieser Seite werden automatisiert per KI aus deinem
            hochgeladenen Material erstellt. Bitte prüfe die erzeugten Inhalte vor Gebrauch auf Richtigkeit.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">Verbraucherstreitbeilegung</h2>
          <p>Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
        </section>
      </div>
    </>
  );
}

export default function ImprintPage() {
  const { locale } = useLanguage();
  return <main className="mx-auto max-w-2xl flex-1 px-4 py-16">{locale === "de" ? <ImprintDe /> : <ImprintEn />}</main>;
}
