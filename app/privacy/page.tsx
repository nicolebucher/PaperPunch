"use client";

import type { ReactNode } from "react";
import { useLanguage } from "@/lib/i18n/language-context";

function DraftNotice({ children }: { children: ReactNode }) {
  return <p className="mb-6 rounded-lg bg-brand-400/10 p-4 text-sm text-brand-300">{children}</p>;
}

function PrivacyEn() {
  return (
    <>
      <h1 className="mb-2 text-2xl font-bold">Privacy Policy</h1>
      <DraftNotice>
        This draft accurately describes how PaperPunch technically handles data today. It is not legal advice -
        fill in the bracketed operator details and have it reviewed (e.g. against GDPR) before publishing.
      </DraftNotice>
      <div className="flex flex-col gap-6 text-sm leading-relaxed text-zinc-300">
        <section>
          <h2 className="mb-1 font-semibold text-white">1. Controller</h2>
          <p>[Your name or company name], [address], [email] - see the Imprint page for full details.</p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">2. Uploaded study material (PDF, JPG, PNG)</h2>
          <p>
            Files you upload are held in memory only for the duration of a single request. They are sent to our
            AI provider (Anthropic) to generate your worksheet, test, or learning game, and are never written to
            a database or disk on our side. Once the response is generated, the file is discarded - we do not
            keep copies, backups, or logs of your uploaded content.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">3. Profile details you enter (age, grade, school type, subject, notes)</h2>
          <p>
            These optional fields are sent together with your upload purely to calibrate the generated content
            and are not stored after your request completes.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">4. AI processing (sub-processor)</h2>
          <p>
            To generate results, your uploaded material and profile details are sent to Anthropic (the provider
            of the Claude AI models) for processing. [Placeholder - add Anthropic&apos;s role as processor to your
            records of processing activity / data processing agreement as required under Art. 28 GDPR.]
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">5. Feedback form</h2>
          <p>
            If you use the feedback page, the message you write (and name/email if you choose to provide them)
            is stored so we can read and, if you left an email, respond to it. [Placeholder - state your actual
            retention period and storage location.]
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">6. Language preference</h2>
          <p>
            Your EN/DE language choice is stored only in your browser&apos;s local storage on your own device -
            it is never sent to us.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">7. Hosting and technical logs</h2>
          <p>
            This site is hosted on Vercel. Standard web server logs (e.g. IP address, timestamp) may be recorded
            by the hosting provider for security and abuse prevention; your IP address is also briefly used
            in-memory to rate-limit excessive requests. [Placeholder - confirm your hosting provider&apos;s log
            retention and add them as a sub-processor if applicable.]
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">8. Analytics</h2>
          <p>
            We use Vercel Web Analytics to understand overall traffic (e.g. page views, referring pages). It is
            cookie-free and does not use persistent identifiers to track you across visits or sites; data is
            aggregated and no individual profile is built.
          </p>
          <p className="mt-2">
            Only if you click “Accept” in the cookie banner do we also use Google Analytics 4 (Google Ireland
            Limited, Gordon House, Barrow Street, Dublin 4, Ireland) to measure which pages and features are used.
            Google Analytics sets cookies (_ga, _ga_*) and processes usage data such as pages visited, device
            type and approximate region; IP addresses are not stored by Google Analytics 4. Google signals and
            ad personalisation are switched off. Legal basis is your consent (Art. 6(1)(a) GDPR, § 25(1) TDDDG).
            You can withdraw it any time via “Cookie settings” at the bottom of every page. Data may be
            transferred to the USA under the EU-US Data Privacy Framework. We do not use advertising cookies.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">9. Minors</h2>
          <p>
            This service may be used by students who are minors. If you are under the age of legal majority in
            your country, please only use this service with the permission of a parent or guardian.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">10. Your rights</h2>
          <p>
            Depending on your jurisdiction, you may have the right to access, correct, delete, or object to the
            processing of your personal data, and to lodge a complaint with a supervisory authority. Contact us
            at hello@paper-punch.com to exercise these rights.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">11. Changes to this policy</h2>
          <p>We may update this policy as the service changes; the current version always applies.</p>
        </section>
      </div>
    </>
  );
}

function PrivacyDe() {
  return (
    <>
      <h1 className="mb-2 text-2xl font-bold">Datenschutzerklärung</h1>
      <DraftNotice>
        Dieser Entwurf beschreibt korrekt, wie PaperPunch aktuell technisch mit Daten umgeht. Er ist keine
        Rechtsberatung - ergänze die Platzhalter zum Anbieter und lasse den Text (z.B. im Hinblick auf die
        DSGVO) vor Veröffentlichung prüfen.
      </DraftNotice>
      <div className="flex flex-col gap-6 text-sm leading-relaxed text-zinc-300">
        <section>
          <h2 className="mb-1 font-semibold text-white">1. Verantwortlicher</h2>
          <p>[Name oder Firma], [Adresse], [E-Mail] - vollständige Angaben siehe Impressum.</p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">2. Hochgeladenes Lernmaterial (PDF, JPG, PNG)</h2>
          <p>
            Hochgeladene Dateien werden nur für die Dauer einer einzelnen Anfrage im Arbeitsspeicher gehalten.
            Sie werden an unseren KI-Anbieter (Anthropic) gesendet, um dein Arbeitsblatt, deine Testarbeit oder
            dein Lernspiel zu erstellen, und niemals auf unserer Seite in einer Datenbank oder auf Festplatte
            gespeichert. Nach der Erstellung der Antwort wird die Datei verworfen - wir behalten keine Kopien,
            Backups oder Protokolle deines hochgeladenen Inhalts.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">3. Eingegebene Profilangaben (Alter, Klasse, Schulart, Fach, Notizen)</h2>
          <p>
            Diese optionalen Angaben werden zusammen mit deinem Upload nur zur Kalibrierung des erstellten
            Inhalts übermittelt und nach Abschluss deiner Anfrage nicht gespeichert.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">4. KI-Verarbeitung (Auftragsverarbeiter)</h2>
          <p>
            Zur Erstellung der Ergebnisse werden dein hochgeladenes Material und deine Profilangaben an
            Anthropic (Anbieter der Claude-KI-Modelle) zur Verarbeitung übermittelt. [Platzhalter - Anthropic
            als Auftragsverarbeiter in dein Verzeichnis von Verarbeitungstätigkeiten aufnehmen bzw. einen
            Auftragsverarbeitungsvertrag nach Art. 28 DSGVO abschließen.]
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">5. Feedback-Formular</h2>
          <p>
            Wenn du die Feedback-Seite nutzt, wird deine Nachricht (sowie Name/E-Mail, falls angegeben)
            gespeichert, damit wir sie lesen und ggf. beantworten können. [Platzhalter - tatsächliche
            Speicherdauer und Speicherort ergänzen.]
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">6. Sprachauswahl</h2>
          <p>
            Deine EN/DE-Sprachauswahl wird ausschließlich im lokalen Speicher deines eigenen Browsers
            gespeichert - sie wird niemals an uns übermittelt.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">7. Hosting und technische Protokolle</h2>
          <p>
            Diese Seite wird bei Vercel gehostet. Übliche Server-Logs (z.B. IP-Adresse, Zeitstempel) können
            vom Hosting-Anbieter zu Sicherheits- und Missbrauchszwecken erfasst werden; deine IP-Adresse wird
            außerdem kurzzeitig im Arbeitsspeicher genutzt, um übermäßige Anfragen zu begrenzen. [Platzhalter -
            Speicherdauer beim Hosting-Anbieter prüfen und ggf. als Auftragsverarbeiter aufnehmen.]
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">8. Analyse (Analytics)</h2>
          <p>
            Wir nutzen Vercel Web Analytics, um den allgemeinen Besucherverkehr zu verstehen (z.B. Seitenaufrufe,
            verweisende Seiten). Der Dienst ist cookie-frei und verwendet keine dauerhaften Kennungen, um dich
            über Besuche oder Websites hinweg zu verfolgen; die Daten werden aggregiert, es wird kein
            individuelles Profil erstellt.
          </p>
          <p className="mt-2">
            Nur wenn du im Cookie-Banner auf „Akzeptieren“ klickst, nutzen wir zusätzlich Google Analytics 4
            (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland), um zu messen, welche Seiten
            und Funktionen genutzt werden. Google Analytics setzt dafür Cookies (_ga, _ga_*) und verarbeitet
            Nutzungsdaten wie aufgerufene Seiten, Gerätetyp und ungefähre Region; IP-Adressen werden von Google
            Analytics 4 nicht gespeichert. Google Signals und Werbe-Personalisierung sind ausgeschaltet.
            Rechtsgrundlage ist deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Du kannst
            sie jederzeit über „Cookie-Einstellungen“ unten auf jeder Seite widerrufen. Eine Übermittlung in die
            USA ist auf Grundlage des EU-US Data Privacy Framework möglich. Werbe-Cookies verwenden wir nicht.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">9. Minderjährige</h2>
          <p>
            Dieser Dienst kann von minderjährigen Schülerinnen und Schülern genutzt werden. Bist du
            minderjährig, nutze den Dienst bitte nur mit Erlaubnis eines Erziehungsberechtigten.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">10. Deine Rechte</h2>
          <p>
            Je nach Rechtsordnung hast du das Recht auf Auskunft, Berichtigung, Löschung oder Widerspruch
            gegen die Verarbeitung deiner personenbezogenen Daten sowie das Recht auf Beschwerde bei einer
            Aufsichtsbehörde. Kontaktiere uns dazu unter [deine@email.de].
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">11. Änderungen dieser Erklärung</h2>
          <p>Wir können diese Erklärung bei Änderungen am Dienst aktualisieren; es gilt jeweils die aktuelle Fassung.</p>
        </section>
      </div>
    </>
  );
}

export default function PrivacyPage() {
  const { locale } = useLanguage();
  return <main className="mx-auto max-w-2xl flex-1 px-4 py-16">{locale === "de" ? <PrivacyDe /> : <PrivacyEn />}</main>;
}
