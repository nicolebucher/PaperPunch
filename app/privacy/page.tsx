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
        Version of 3 November 2026. This draft describes how PaperPunch handles data today; it is not legal
        advice and will be reviewed before the public launch.
      </DraftNotice>
      <div className="flex flex-col gap-6 text-sm leading-relaxed text-zinc-300">
        <section>
          <h2 className="mb-1 font-semibold text-white">1. Controller</h2>
          <p>[Your name], [postal address], hello@paper-punch.com - see the Imprint page for full details.</p>
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
            To generate results, your uploaded material, typed topic/notes and profile details are sent to
            Anthropic, PBC (USA), the provider of the Claude AI models, which processes them on our behalf under a
            data processing agreement (Art. 28 GDPR). The transfer to the USA is based on the EU Standard
            Contractual Clauses (Art. 46 GDPR). Under Anthropic&apos;s commercial terms, content sent through its
            API is not used to train AI models and is deleted after a short retention period.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">5. Feedback form</h2>
          <p>
            If you use the feedback page, the message you write (and name/email if you choose to provide them)
            and ratings from the app reach us by email or in a spreadsheet in our Google Workspace (Google Ireland
            Limited) so we can read them, respond if you left an email, and improve PaperPunch. We delete them when
            they are no longer needed for that, at the latest after 24 months.
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
            in-memory to rate-limit excessive requests. Vercel Inc. (USA) acts as our processor under a data
            processing agreement; transfers to the USA are based on the EU-US Data Privacy Framework and the EU
            Standard Contractual Clauses. Our server runs in Frankfurt (EU).
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
          <h2 className="mb-1 font-semibold text-white">Android app</h2>
          <p>
            The PaperPunch Android app works without an account. Your profile (language, country, school type,
            grade, appearance), study plans, punches, your last 20 study materials and the photos/PDFs you used
            for them are stored only on your phone and are deleted when you uninstall the app. The app uses the
            camera only when you take a photo of your study material, and local notifications only for study
            plan reminders you switch on. To create material, your photos/PDFs and profile details are sent to
            our server and the AI provider as described in sections 2–4; while a material is being created, the
            finished result is held in our hosting provider&apos;s storage (Vercel, EU/US) for at most 24 hours
            until your app has fetched it, and then deleted. If you rate a material, we receive the stars, your
            optional comment, the format, subject, grade, country, language and score – no name, no photos. The
            app contains no ads and no analytics or tracking tools.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">9. Legal bases</h2>
          <p>
            Creating the material you ask for and running the website and app: Art. 6(1)(b) GDPR (providing the
            service you use). Security logs, rate limiting and evaluating ratings to improve quality: Art. 6(1)(f)
            GDPR (our legitimate interest in a secure, working service). Google Analytics on the website: only with
            your consent, Art. 6(1)(a) GDPR.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">10. Children and teenagers</h2>
          <p>
            PaperPunch is made for students and is often used by minors, so we collect as little as possible: no
            account, no names, no tracking in the app. Under 16, consent-based processing (Google Analytics on the
            website) needs the consent of a parent or guardian – if you are under 16, please do not click
            “Accept” without them. Please do not upload anything with personal details of yourself or others
            (full names, addresses, photos of people).
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">11. Your rights</h2>
          <p>
            Depending on your jurisdiction, you may have the right to access, correct, delete, or object to the
            processing of your personal data, to withdraw consent at any time, and to lodge a complaint with a
            data protection supervisory authority. Contact us at hello@paper-punch.com to exercise these rights.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">12. Changes to this policy</h2>
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
        Stand: 3. November 2026. Dieser Entwurf beschreibt, wie PaperPunch heute mit Daten umgeht; er ist
        keine Rechtsberatung und wird vor dem öffentlichen Start geprüft.
      </DraftNotice>
      <div className="flex flex-col gap-6 text-sm leading-relaxed text-zinc-300">
        <section>
          <h2 className="mb-1 font-semibold text-white">1. Verantwortlicher</h2>
          <p>[Name], [Anschrift], hello@paper-punch.com - vollständige Angaben siehe Impressum.</p>
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
            Zur Erstellung der Ergebnisse werden dein hochgeladenes Material, dein eingetipptes Thema bzw. deine
            Notiz und deine Profilangaben an Anthropic, PBC (USA), den Anbieter der Claude-KI-Modelle, übermittelt.
            Anthropic verarbeitet sie in unserem Auftrag auf Grundlage eines Auftragsverarbeitungsvertrags
            (Art. 28 DSGVO). Die Übermittlung in die USA erfolgt auf Grundlage der EU-Standardvertragsklauseln
            (Art. 46 DSGVO). Nach den geschäftlichen Bedingungen von Anthropic werden über die API gesendete
            Inhalte nicht zum Training von KI-Modellen verwendet und nach kurzer Zeit gelöscht.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">5. Feedback-Formular</h2>
          <p>
            Wenn du die Feedback-Seite nutzt, wird deine Nachricht (sowie Name/E-Mail, falls angegeben)
            sowie Bewertungen aus der App erreichen uns per E-Mail bzw. in einer Tabelle in unserem Google Workspace
            (Google Ireland Limited), damit wir sie lesen, ggf. beantworten und PaperPunch verbessern können. Wir
            löschen sie, sobald sie dafür nicht mehr nötig sind, spätestens nach 24 Monaten.
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
            außerdem kurzzeitig im Arbeitsspeicher genutzt, um übermäßige Anfragen zu begrenzen. Vercel Inc. (USA)
            ist unser Auftragsverarbeiter (Auftragsverarbeitungsvertrag); Übermittlungen in die USA erfolgen auf
            Grundlage des EU-US Data Privacy Framework und der EU-Standardvertragsklauseln. Unser Server läuft in
            Frankfurt (EU).
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
          <h2 className="mb-1 font-semibold text-white">Android-App</h2>
          <p>
            Die PaperPunch-App für Android funktioniert ohne Konto. Dein Profil (Sprache, Land, Schulart, Klasse,
            Darstellung), Lernpläne, Punches, deine letzten 20 Lernmaterialien und die dafür verwendeten
            Fotos/PDFs werden nur auf deinem Handy gespeichert und beim Deinstallieren der App gelöscht. Die App
            nutzt die Kamera nur, wenn du deinen Lernstoff fotografierst, und lokale Benachrichtigungen nur für
            Lernplan-Erinnerungen, die du selbst einschaltest. Zum Erstellen von Material werden deine Fotos/PDFs
            und Profilangaben wie in Abschnitt 2–4 beschrieben an unseren Server und den KI-Anbieter übermittelt;
            während ein Material erstellt wird, liegt das fertige Ergebnis höchstens 24 Stunden im Speicher
            unseres Hosting-Anbieters (Vercel, EU/USA), bis deine App es abgeholt hat, und wird dann gelöscht.
            Wenn du ein Material bewertest, erhalten wir die Sterne, deinen optionalen Kommentar, Format, Fach,
            Klasse, Land, Sprache und Punktzahl – keinen Namen, keine Fotos. Die App enthält keine Werbung und
            keine Analyse- oder Tracking-Tools.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">9. Rechtsgrundlagen</h2>
          <p>
            Erstellen des gewünschten Materials und Betrieb von Website und App: Art. 6 Abs. 1 lit. b DSGVO
            (Bereitstellung des Dienstes, den du nutzt). Sicherheits-Logs, Begrenzung von Anfragen und Auswertung
            von Bewertungen zur Qualitätsverbesserung: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem
            sicheren, funktionierenden Dienst). Google Analytics auf der Website: nur mit deiner Einwilligung,
            Art. 6 Abs. 1 lit. a DSGVO.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">10. Kinder und Jugendliche</h2>
          <p>
            PaperPunch ist für Schülerinnen und Schüler gemacht und wird oft von Minderjährigen genutzt. Deshalb
            erheben wir so wenig wie möglich: kein Konto, keine Namen, kein Tracking in der App. Unter 16 Jahren
            braucht eine einwilligungsbasierte Verarbeitung (Google Analytics auf der Website) die Zustimmung der
            Eltern bzw. Erziehungsberechtigten – wenn du unter 16 bist, klicke bitte nicht ohne sie auf
            „Akzeptieren“. Lade bitte nichts mit persönlichen Angaben von dir oder anderen hoch (vollständige
            Namen, Adressen, Fotos von Personen).
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">11. Deine Rechte</h2>
          <p>
            Je nach Rechtsordnung hast du das Recht auf Auskunft, Berichtigung, Löschung oder Widerspruch
            gegen die Verarbeitung deiner personenbezogenen Daten, das Recht, eine Einwilligung jederzeit zu
            widerrufen, sowie das Recht auf Beschwerde bei einer Datenschutz-Aufsichtsbehörde. Schreib uns dazu an
            hello@paper-punch.com.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">12. Änderungen dieser Erklärung</h2>
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
