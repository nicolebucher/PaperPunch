"use client";

import type { ReactNode } from "react";
import { useLanguage } from "@/lib/i18n/language-context";

function DraftNotice({ children }: { children: ReactNode }) {
  return <p className="mb-6 rounded-lg bg-brand-400/10 p-4 text-sm text-brand-300">{children}</p>;
}

function TermsEn() {
  return (
    <>
      <h1 className="mb-2 text-2xl font-bold">Service Agreement</h1>
      <DraftNotice>
        This is a draft template, not legal advice. Have it reviewed by a lawyer and fill in the bracketed
        placeholders before publishing.
      </DraftNotice>
      <ol className="flex flex-col gap-5 text-sm leading-relaxed text-zinc-300">
        <li>
          <h2 className="mb-1 font-semibold text-white">1. Scope</h2>
          <p>
            This agreement governs the use of PaperPunch (&quot;the Service&quot;), which turns study material you
            upload into a worksheet, test, or learning game using AI.
          </p>
        </li>
        <li>
          <h2 className="mb-1 font-semibold text-white">2. Description of the Service</h2>
          <p>
            You upload study material (PDF, JPG, or PNG); the Service uses AI to generate derived learning
            material from it. Output quality depends on the AI and on the material you provide - we do not
            guarantee accuracy or exam-readiness.
          </p>
        </li>
        <li>
          <h2 className="mb-1 font-semibold text-white">3. Eligibility and minors</h2>
          <p>
            If you are under the age of legal majority in your country, please get permission from a parent or
            guardian before using this Service. [Placeholder - adapt to applicable law, e.g. GDPR Art. 8 for
            children under 16 in the EU.]
          </p>
        </li>
        <li>
          <h2 className="mb-1 font-semibold text-white">4. Uploaded content</h2>
          <p>
            You confirm you have the right to upload the material you submit. Uploaded files are used only to
            generate the material you requested and are deleted immediately afterwards - they are not stored.
          </p>
        </li>
        <li>
          <h2 className="mb-1 font-semibold text-white">5. AI-generated content</h2>
          <p>
            Generated worksheets, tests, and games are created automatically and may contain errors. Always
            double-check content before using it to study or teach.
          </p>
        </li>
        <li>
          <h2 className="mb-1 font-semibold text-white">6. Acceptable use</h2>
          <p>
            Do not upload unlawful, harmful material, or copyrighted material you don&apos;t have the rights to,
            and do not use the Service to generate harmful content.
          </p>
        </li>
        <li>
          <h2 className="mb-1 font-semibold text-white">7. Availability</h2>
          <p>
            The Service is provided &quot;as is&quot; without uptime guarantees. [Placeholder - adjust for your
            actual hosting and support commitments.]
          </p>
        </li>
        <li>
          <h2 className="mb-1 font-semibold text-white">8. Liability</h2>
          <p>[Placeholder - insert a limitation-of-liability clause appropriate to your jurisdiction.]</p>
        </li>
        <li>
          <h2 className="mb-1 font-semibold text-white">9. Changes to this agreement</h2>
          <p>This agreement may be updated from time to time; continued use after changes means acceptance of the new terms.</p>
        </li>
        <li>
          <h2 className="mb-1 font-semibold text-white">10. Governing law</h2>
          <p>[Placeholder - insert the applicable jurisdiction.]</p>
        </li>
      </ol>
    </>
  );
}

function TermsDe() {
  return (
    <>
      <h1 className="mb-2 text-2xl font-bold">Nutzungsvereinbarung</h1>
      <DraftNotice>
        Dies ist eine Vorlage, keine Rechtsberatung. Lasse den Text von einer Rechtsanwältin/einem Rechtsanwalt
        prüfen und ergänze die Platzhalter vor der Veröffentlichung.
      </DraftNotice>
      <ol className="flex flex-col gap-5 text-sm leading-relaxed text-zinc-300">
        <li>
          <h2 className="mb-1 font-semibold text-white">1. Geltungsbereich</h2>
          <p>
            Diese Vereinbarung regelt die Nutzung von PaperPunch („der Dienst“), der aus hochgeladenem Lernmaterial
            per KI ein Arbeitsblatt, eine Testarbeit oder ein Lernspiel erstellt.
          </p>
        </li>
        <li>
          <h2 className="mb-1 font-semibold text-white">2. Leistungsbeschreibung</h2>
          <p>
            Du lädst Lernmaterial hoch (PDF, JPG oder PNG); der Dienst nutzt KI, um daraus abgeleitetes
            Lernmaterial zu erstellen. Die Qualität der Ausgabe hängt von der KI und dem bereitgestellten
            Material ab - wir garantieren keine Richtigkeit oder Prüfungstauglichkeit.
          </p>
        </li>
        <li>
          <h2 className="mb-1 font-semibold text-white">3. Nutzungsberechtigung und Minderjährige</h2>
          <p>
            Bist du minderjährig, hole bitte vorab die Erlaubnis eines Erziehungsberechtigten ein. [Platzhalter -
            an geltendes Recht anpassen, z.B. Art. 8 DSGVO für unter 16-Jährige in der EU.]
          </p>
        </li>
        <li>
          <h2 className="mb-1 font-semibold text-white">4. Hochgeladene Inhalte</h2>
          <p>
            Du bestätigst, dass du zum Hochladen des eingereichten Materials berechtigt bist. Hochgeladene
            Dateien werden nur zur Erstellung des angeforderten Materials genutzt und danach sofort gelöscht -
            sie werden nicht gespeichert.
          </p>
        </li>
        <li>
          <h2 className="mb-1 font-semibold text-white">5. KI-generierte Inhalte</h2>
          <p>
            Erstellte Arbeitsblätter, Testarbeiten und Spiele werden automatisiert generiert und können Fehler
            enthalten. Prüfe Inhalte immer, bevor du sie zum Lernen oder Lehren einsetzt.
          </p>
        </li>
        <li>
          <h2 className="mb-1 font-semibold text-white">6. Zulässige Nutzung</h2>
          <p>
            Lade keine rechtswidrigen, schädlichen oder urheberrechtlich geschützten Inhalte hoch, an denen du
            keine Rechte hast, und nutze den Dienst nicht zur Erstellung schädlicher Inhalte.
          </p>
        </li>
        <li>
          <h2 className="mb-1 font-semibold text-white">7. Verfügbarkeit</h2>
          <p>
            Der Dienst wird „wie besehen“ ohne Verfügbarkeitsgarantie bereitgestellt. [Platzhalter - an dein
            tatsächliches Hosting und Support-Angebot anpassen.]
          </p>
        </li>
        <li>
          <h2 className="mb-1 font-semibold text-white">8. Haftung</h2>
          <p>[Platzhalter - füge eine für deine Rechtsordnung passende Haftungsbeschränkung ein.]</p>
        </li>
        <li>
          <h2 className="mb-1 font-semibold text-white">9. Änderungen dieser Vereinbarung</h2>
          <p>
            Diese Vereinbarung kann von Zeit zu Zeit aktualisiert werden; die weitere Nutzung nach einer Änderung
            gilt als Zustimmung zu den neuen Bedingungen.
          </p>
        </li>
        <li>
          <h2 className="mb-1 font-semibold text-white">10. Anwendbares Recht</h2>
          <p>[Platzhalter - anwendbare Rechtsordnung einfügen.]</p>
        </li>
      </ol>
    </>
  );
}

export default function TermsPage() {
  const { locale } = useLanguage();
  return <main className="mx-auto max-w-2xl flex-1 px-4 py-16">{locale === "de" ? <TermsDe /> : <TermsEn />}</main>;
}
