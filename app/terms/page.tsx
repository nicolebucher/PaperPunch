"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useLanguage } from "@/lib/i18n/language-context";

function DraftNotice({ children }: { children: ReactNode }) {
  return <p className="mb-6 rounded-lg bg-brand-400/10 p-4 text-sm text-brand-300">{children}</p>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-1 font-semibold text-white">{title}</h2>
      {children}
    </section>
  );
}

const STAND_DE = "3. November 2026";
const STAND_EN = "3 November 2026";

function TermsEn() {
  return (
    <>
      <h1 className="mb-1 text-2xl font-bold">Terms of Use</h1>
      <p className="mb-4 text-sm text-zinc-400">Version of {STAND_EN}</p>
      <DraftNotice>
        Draft for the beta phase, not legal advice. To be reviewed before the public launch.
      </DraftNotice>
      <div className="flex flex-col gap-5 text-sm leading-relaxed text-zinc-300">
        <Section title="1. Who we are and what these terms cover">
          <p>
            PaperPunch is offered by the operator named in the <Link href="/imprint" className="underline">imprint</Link>.
            These terms apply to the website paper-punch.com and the PaperPunch Android app (together “PaperPunch”).
            For the app, Google Play&apos;s terms also apply.
          </p>
        </Section>
        <Section title="2. What PaperPunch does">
          <p>
            You upload photos or PDFs of your study material or type a topic. PaperPunch uses artificial
            intelligence (AI) to create worksheets, tests, learning games and study plans from it. No account is
            needed. PaperPunch is currently a free beta: features can change, be paused or end, and there is no
            claim to permanent availability.
          </p>
        </Section>
        <Section title="3. AI-generated content can contain mistakes">
          <p>
            All learning materials are generated automatically by AI. They can contain factual errors, wrong
            answers in the answer key or tasks that do not fit your class. They do not replace your teacher, your
            textbook or the official requirements of your school. If something looks wrong, check it with your
            material or ask your teacher – and tell us at hello@paper-punch.com so we can improve.
          </p>
        </Section>
        <Section title="4. Children and teenagers">
          <p>
            PaperPunch is made for students. If you are under 16, please use it together with or with the
            permission of a parent or guardian. Do not upload anything with personal details such as full names,
            addresses, photos of people or grades of other students.
          </p>
        </Section>
        <Section title="5. What you upload">
          <p>
            Only upload material you are allowed to use for your own studying – for example your own notes,
            worksheets from your class or pages from your textbook for private study. Do not upload anything
            unlawful, offensive or other people&apos;s personal data. You keep all rights to your material. You
            allow us to process it only to create the material you asked for; it is not used for anything else
            (see the <Link href="/privacy" className="underline">privacy policy</Link>).
          </p>
        </Section>
        <Section title="6. Using the results">
          <p>
            You may use, print and share the generated material for learning and teaching, for example with
            classmates or your study group. Please do not sell it or publish it as your own product.
          </p>
        </Section>
        <Section title="7. Fair use">
          <p>
            Do not try to overload, attack or misuse PaperPunch (e.g. automated mass requests). We may limit or
            block access if that happens.
          </p>
        </Section>
        <Section title="8. Your data in the app">
          <p>
            The app stores your profile, study plans and materials only on your phone. If you delete the app or
            its data, they are gone – we cannot restore them.
          </p>
        </Section>
        <Section title="9. Liability">
          <p>
            PaperPunch is free of charge. We are therefore liable only for intent and gross negligence. This does
            not limit liability for injury to life, body or health, under the Product Liability Act, or where a
            limitation is not permitted by law.
          </p>
        </Section>
        <Section title="10. Changes">
          <p>
            We may update these terms, for example when new features are added. The version shown here at the time
            you use PaperPunch applies. We will point out important changes in the app or on the website.
          </p>
        </Section>
        <Section title="11. Applicable law and contact">
          <p>
            German law applies. If you are a consumer living in another country, the mandatory consumer protection
            rules of that country remain unaffected. Questions: hello@paper-punch.com.
          </p>
        </Section>
      </div>
    </>
  );
}

function TermsDe() {
  return (
    <>
      <h1 className="mb-1 text-2xl font-bold">Nutzungsbedingungen</h1>
      <p className="mb-4 text-sm text-zinc-400">Stand: {STAND_DE}</p>
      <DraftNotice>Entwurf für die Beta-Phase, keine Rechtsberatung. Wird vor dem öffentlichen Start geprüft.</DraftNotice>
      <div className="flex flex-col gap-5 text-sm leading-relaxed text-zinc-300">
        <Section title="1. Wer wir sind und wofür diese Bedingungen gelten">
          <p>
            PaperPunch wird von der im <Link href="/imprint" className="underline">Impressum</Link> genannten Person
            angeboten. Diese Bedingungen gelten für die Website paper-punch.com und die Android-App PaperPunch
            (zusammen „PaperPunch“). Für die App gelten zusätzlich die Bedingungen von Google Play.
          </p>
        </Section>
        <Section title="2. Was PaperPunch macht">
          <p>
            Du lädst Fotos oder PDFs von deinem Lernstoff hoch oder tippst ein Thema ein. PaperPunch erstellt daraus
            mit künstlicher Intelligenz (KI) Arbeitsblätter, Tests, Lernspiele und Lernpläne. Ein Konto brauchst du
            nicht. PaperPunch ist derzeit eine kostenlose Beta: Funktionen können sich ändern, pausieren oder
            eingestellt werden; einen Anspruch auf dauerhafte Verfügbarkeit gibt es nicht.
          </p>
        </Section>
        <Section title="3. KI-Inhalte können Fehler enthalten">
          <p>
            Alle Lernmaterialien werden automatisch von einer KI erstellt. Sie können sachliche Fehler, falsche
            Lösungen oder Aufgaben enthalten, die nicht zu deiner Klasse passen. Sie ersetzen nicht deine
            Lehrkraft, dein Schulbuch oder die Vorgaben deiner Schule. Wenn dir etwas falsch vorkommt, prüfe es mit
            deinem Material oder frag deine Lehrkraft – und schreib uns gern an hello@paper-punch.com, damit wir
            besser werden.
          </p>
        </Section>
        <Section title="4. Kinder und Jugendliche">
          <p>
            PaperPunch ist für Schülerinnen und Schüler gemacht. Wenn du unter 16 bist, nutze PaperPunch bitte
            gemeinsam mit oder mit Erlaubnis deiner Eltern bzw. Erziehungsberechtigten. Lade nichts mit
            persönlichen Angaben hoch, z. B. vollständige Namen, Adressen, Fotos von Personen oder Noten anderer.
          </p>
        </Section>
        <Section title="5. Was du hochlädst">
          <p>
            Lade nur Material hoch, das du für dein eigenes Lernen nutzen darfst – zum Beispiel eigene Notizen,
            Arbeitsblätter aus deinem Unterricht oder Seiten aus deinem Schulbuch zum privaten Lernen. Lade nichts
            Rechtswidriges, Beleidigendes und keine personenbezogenen Daten anderer hoch. Alle Rechte an deinem
            Material bleiben bei dir. Du erlaubst uns nur, es zu verarbeiten, um das gewünschte Lernmaterial zu
            erstellen; für nichts anderes wird es genutzt (siehe{" "}
            <Link href="/privacy" className="underline">Datenschutzerklärung</Link>).
          </p>
        </Section>
        <Section title="6. Nutzung der Ergebnisse">
          <p>
            Du darfst das erstellte Material zum Lernen und Unterrichten nutzen, ausdrucken und teilen, zum Beispiel
            mit deiner Klasse oder Lerngruppe. Bitte verkaufe es nicht und veröffentliche es nicht als eigenes
            Produkt.
          </p>
        </Section>
        <Section title="7. Faire Nutzung">
          <p>
            Versuche nicht, PaperPunch zu überlasten, anzugreifen oder zu missbrauchen (z. B. durch automatisierte
            Massenanfragen). Sonst können wir den Zugang einschränken oder sperren.
          </p>
        </Section>
        <Section title="8. Deine Daten in der App">
          <p>
            Die App speichert Profil, Lernpläne und Materialien nur auf deinem Handy. Wenn du die App oder ihre
            Daten löschst, sind sie weg – wir können sie nicht wiederherstellen.
          </p>
        </Section>
        <Section title="9. Haftung">
          <p>
            PaperPunch ist kostenlos. Wir haften deshalb nur für Vorsatz und grobe Fahrlässigkeit. Das gilt nicht
            für Schäden aus der Verletzung von Leben, Körper oder Gesundheit, für die Haftung nach dem
            Produkthaftungsgesetz und soweit eine Beschränkung gesetzlich nicht zulässig ist.
          </p>
        </Section>
        <Section title="10. Änderungen">
          <p>
            Wir können diese Bedingungen anpassen, z. B. wenn neue Funktionen dazukommen. Es gilt die Fassung, die
            hier zum Zeitpunkt deiner Nutzung steht. Auf wichtige Änderungen weisen wir in der App oder auf der
            Website hin.
          </p>
        </Section>
        <Section title="11. Anwendbares Recht und Kontakt">
          <p>
            Es gilt deutsches Recht. Wenn du als Verbraucher in einem anderen Land lebst, bleiben die zwingenden
            Verbraucherschutzvorschriften dieses Landes unberührt. Fragen: hello@paper-punch.com.
          </p>
        </Section>
      </div>
    </>
  );
}

export default function TermsPage() {
  const { locale } = useLanguage();
  return <main className="mx-auto max-w-2xl flex-1 px-4 py-16">{locale === "de" ? <TermsDe /> : <TermsEn />}</main>;
}
