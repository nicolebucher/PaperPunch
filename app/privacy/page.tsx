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
        Version of 6 November 2026.
      </DraftNotice>
      <div className="flex flex-col gap-6 text-sm leading-relaxed text-zinc-300">
        <section>
          <h2 className="mb-1 font-semibold text-white">1. Controller</h2>
          <p>Nicole Bucher, Dorfstraße 64, 01737 Pohrsdorf, Germany. Email: hello@paper-punch.com</p>
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
          <h2 className="mb-1 font-semibold text-white">5. Feedback and ratings</h2>
          <p>
            If you use the feedback page, we receive the message you write (and name/email if you choose to provide
            them). If you rate a study material in the app or on the website, we receive the stars, your optional
            comment and context about the material: format, title, subject, language, country, school type, grade
            and, if available, the score (e.g. “6/8”) – no photos, no names. Both are stored in a non-public storage
            area of our hosting provider (Vercel, data centre in Frankfurt, Germany) and in a spreadsheet in our
            Google account (Google Sheets; Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland),
            so we can read them, reply if you left an email, and improve PaperPunch. We review them about once a
            week. We delete them when they are no longer needed for that, at the latest after 24 months.
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
          <p className="mt-2">
            Weekly limit during the beta: to count how many materials have been created this week, we store a
            counter together with a pseudonymous key (a one-way hash of a random ID generated on your device, or of
            your IP address if no ID is sent) with Upstash, Inc. (Redis database, data centre in Frankfurt), our
            processor. No content, names or other details are stored. The counter is deleted automatically after
            8 days.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">8. Analytics</h2>
          <p>
            We use Vercel Web Analytics to understand overall traffic (e.g. page views, referring pages). It is
            cookie-free and does not use persistent identifiers to track you across visits or sites; data is
            aggregated and no individual profile is built. We also count, per day and without any identifier, how often
            the cookie banner was shown, accepted or declined. In the same way, the website and the app report once per
            visit how long it lasted and how many pages or screens were viewed, and count whether materials are opened as PDF or solved online; we store only daily totals, without any
            identifier and without a cookie.
          </p>
          <p className="mt-2">
            To know how many different people use the website and the app, this visit report also includes the
            random ID generated on your device (the same one used for the weekly limit, stored in your browser&apos;s
            local storage or in the app). Our server immediately turns it into a one-way hash and adds it only to a
            counting structure (HyperLogLog) with Upstash, Inc. (data centre in Frankfurt), our processor. From it we
            can only read how many different devices visited on a day, in a month or over several days, never which
            ones; the ID itself is not stored. The counters are deleted automatically after 400 days. Legal basis:
            our legitimate interest in understanding how many people use the service so we can plan costs and
            capacity (Art. 6(1)(f) GDPR). You can delete the ID at any time by clearing this site&apos;s data in your
            browser or the app&apos;s data on your device.
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
          <h2 className="mb-1 font-semibold text-white">9. Android app</h2>
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
          <h2 className="mb-1 font-semibold text-white">10. Challenges</h2>
          <p>
            If you send a challenge for a learning game, we store the game (questions and answers), the nickname
            you enter and your share of correct answers under a random six-character code in our hosting
            provider&apos;s storage (Vercel, Frankfurt). Anyone with the link can open the game and sees the
            nickname and result. Please use a nickname, not your full name. The entry is deleted after 30 days.
            Whoever plays a challenge enters a nickname that is only kept in their own browser; their result is
            not stored on our server unless they send a new challenge themselves.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">11. Study groups</h2>
          <p>
            If you start a study group, we store the learning game (questions and answers), the group name, your
            nickname and the end date under a random six-character code in our hosting provider&apos;s storage
            (Vercel, Frankfurt). Everyone who plays via the link adds an entry with their nickname, share of correct
            answers, number of correct answers, playing time and a pseudonymous device key (derived from a random ID
            stored on the device, so that only the first try counts). Anyone with the link sees the leaderboard with
            nicknames and results. In addition, each entry stores which questions were answered correctly and the
            answer given (shortened to 60 characters). Only the person who started the group sees this, via a private
            results link with a secret key that only they receive; it shows which questions the group found hard and
            each nickname&apos;s overall result, but no per-child analysis of weaknesses. For homework groups, players only see their own result; the ranking is only visible in the results view. Please use a nickname, not
            your full name. Groups and entries are deleted after
            at most 44 days (30 days plus a maximum running time of 14 days). There is no chat and no sign-up.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">12. Legal bases</h2>
          <p>
            Creating the material you ask for and running the website and app: Art. 6(1)(b) GDPR (providing the
            service you use). Security logs, rate limiting and evaluating ratings to improve quality: Art. 6(1)(f)
            GDPR (our legitimate interest in a secure, working service). Google Analytics on the website: only with
            your consent, Art. 6(1)(a) GDPR.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">13. Children and teenagers</h2>
          <p>
            PaperPunch is made for students and is often used by minors, so we collect as little as possible: no
            account, no names, no tracking in the app. Under 16, consent-based processing (Google Analytics on the
            website) needs the consent of a parent or guardian – if you are under 16, please do not click
            “Accept” without them. Please do not upload anything with personal details of yourself or others
            (full names, addresses, photos of people).
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">14. Your rights</h2>
          <p>
            Depending on your jurisdiction, you may have the right to access, correct, delete, or object to the
            processing of your personal data, to withdraw consent at any time, and to lodge a complaint with a
            data protection supervisory authority. Contact us at hello@paper-punch.com to exercise these rights.
            The supervisory authority responsible for us is the Saxon Data Protection and Transparency Commissioner
            (Sächsische Datenschutz- und Transparenzbeauftragte, Devrientstraße 5, 01067 Dresden, Germany).
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">15. Changes to this policy</h2>
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
        Stand: 6. November 2026.
      </DraftNotice>
      <div className="flex flex-col gap-6 text-sm leading-relaxed text-zinc-300">
        <section>
          <h2 className="mb-1 font-semibold text-white">1. Verantwortlicher</h2>
          <p>Nicole Bucher, Dorfstraße 64, 01737 Pohrsdorf, Deutschland. E-Mail: hello@paper-punch.com</p>
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
          <h2 className="mb-1 font-semibold text-white">5. Feedback und Bewertungen</h2>
          <p>
            Wenn du die Feedback-Seite nutzt, erhalten wir deine Nachricht (sowie Name/E-Mail, falls du sie
            angibst). Wenn du ein Lernmaterial in der App oder auf der Website bewertest, erhalten wir die Sterne,
            deinen optionalen Kommentar und Angaben zum Material: Format, Titel, Fach, Sprache, Land, Schulart,
            Klasse und, falls vorhanden, das Ergebnis (z. B. „6/8“) – keine Fotos, keine Namen. Beides wird in einem
            nicht öffentlichen Speicherbereich unseres Hosting-Anbieters (Vercel, Rechenzentrum in Frankfurt) und in
            einer Tabelle in unserem Google-Konto gespeichert (Google Sheets; Google Ireland Limited, Gordon House,
            Barrow Street, Dublin 4, Irland), damit wir es lesen, ggf. beantworten und PaperPunch verbessern können.
            Wir sehen es etwa einmal pro Woche durch. Wir löschen es, sobald es dafür nicht mehr nötig ist,
            spätestens nach 24 Monaten.
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
          <p className="mt-2">
            Wochen-Kontingent in der Beta: Um zu zählen, wie viele Materialien in dieser Woche erstellt wurden,
            speichern wir einen Zähler zusammen mit einem pseudonymen Schlüssel (ein nicht umkehrbarer Hash einer
            zufälligen, auf deinem Gerät erzeugten Kennung bzw. deiner IP-Adresse, falls keine Kennung mitgeschickt
            wird) bei Upstash, Inc. (Redis-Datenbank, Rechenzentrum Frankfurt) als Auftragsverarbeiter. Inhalte,
            Namen oder andere Angaben werden dabei nicht gespeichert. Der Zähler wird nach 8 Tagen automatisch
            gelöscht.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">8. Analyse (Analytics)</h2>
          <p>
            Wir nutzen Vercel Web Analytics, um den allgemeinen Besucherverkehr zu verstehen (z.B. Seitenaufrufe,
            verweisende Seiten). Der Dienst ist cookie-frei und verwendet keine dauerhaften Kennungen, um dich
            über Besuche oder Websites hinweg zu verfolgen; die Daten werden aggregiert, es wird kein
            individuelles Profil erstellt. Außerdem zählen wir pro Tag und ohne jede Kennung, wie oft das Cookie-Banner
            angezeigt, akzeptiert oder abgelehnt wurde. Ebenso melden Website und App einmal pro Besuch, wie lange er
            gedauert hat und wie viele Seiten bzw. Bildschirme aufgerufen wurden, und zählen, ob Materialien als PDF geöffnet oder online gelöst werden; gespeichert werden nur Tagessummen,
            ohne Kennung und ohne Cookie.
          </p>
          <p className="mt-2">
            Um zu wissen, wie viele verschiedene Menschen Website und App nutzen, enthält diese Besuchsmeldung
            außerdem die zufällige, auf deinem Gerät erzeugte Kennung (dieselbe wie fürs Wochen-Kontingent,
            gespeichert im lokalen Speicher deines Browsers bzw. in der App). Unser Server macht daraus sofort einen
            nicht umkehrbaren Hash und fügt ihn nur einer Zählstruktur (HyperLogLog) bei Upstash, Inc.
            (Rechenzentrum Frankfurt) als Auftragsverarbeiter hinzu. Daraus können wir nur ablesen, wie viele
            verschiedene Geräte an einem Tag, in einem Monat oder über mehrere Tage da waren, nie welche; die Kennung
            selbst wird nicht gespeichert. Die Zähler werden nach 400 Tagen automatisch gelöscht. Rechtsgrundlage:
            unser berechtigtes Interesse, zu verstehen, wie viele Menschen den Dienst nutzen, um Kosten und
            Kapazität zu planen (Art. 6 Abs. 1 lit. f DSGVO). Du kannst die Kennung jederzeit löschen, indem du die
            Websitedaten im Browser bzw. die App-Daten auf deinem Gerät löschst.
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
          <h2 className="mb-1 font-semibold text-white">9. Android-App</h2>
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
          <h2 className="mb-1 font-semibold text-white">10. Challenges</h2>
          <p>
            Wenn du eine Challenge zu einem Lernspiel verschickst, speichern wir das Spiel (Fragen und Antworten),
            den Spitznamen, den du eingibst, und deinen Anteil richtiger Antworten unter einem zufälligen
            sechsstelligen Code im Speicher unseres Hosting-Anbieters (Vercel, Frankfurt). Wer den Link hat, kann
            das Spiel öffnen und sieht Spitzname und Ergebnis. Bitte nutze einen Spitznamen, nicht deinen vollen
            Namen. Der Eintrag wird nach 30 Tagen gelöscht. Wer eine Challenge spielt, gibt einen Spitznamen ein,
            der nur im eigenen Browser bleibt; das Ergebnis wird nicht auf unserem Server gespeichert, außer man
            verschickt selbst eine neue Challenge.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">11. Lerngruppen</h2>
          <p>
            Wenn du eine Lerngruppe startest, speichern wir das Lernspiel (Fragen und Antworten), den Gruppennamen,
            deinen Spitznamen und das Enddatum unter einem zufälligen sechsstelligen Code im Speicher unseres
            Hosting-Anbieters (Vercel, Frankfurt). Wer über den Link mitspielt, legt einen Eintrag mit Spitzname,
            Anteil und Zahl richtiger Antworten, Spielzeit und einem pseudonymen Geräteschlüssel an (abgeleitet aus
            einer zufälligen, auf dem Gerät gespeicherten Kennung, damit nur der erste Versuch zählt). Wer den Link
            hat, sieht die Rangliste mit Spitznamen und Ergebnissen. Zusätzlich speichert jeder Eintrag, welche
            Fragen richtig beantwortet wurden, und die gegebene Antwort (auf 60 Zeichen gekürzt). Das sieht nur, wer
            die Gruppe gestartet hat – über einen privaten Auswertungs-Link mit geheimem Schlüssel, den nur diese
            Person erhält. Er zeigt, welche Fragen der Gruppe schwerfielen, und das Gesamtergebnis pro Spitzname,
            aber keine Auswertung von Schwächen einzelner Kinder. Bei Hausaufgaben sehen Mitspielende nur ihr eigenes Ergebnis; die Rangliste ist nur in der Auswertung sichtbar. Bitte nutze einen Spitznamen, nicht deinen
            vollen Namen. Gruppen und Einträge werden nach spätestens 44 Tagen gelöscht (30 Tage plus höchstens
            14 Tage Laufzeit). Es gibt keinen Chat und keine Anmeldung.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">12. Rechtsgrundlagen</h2>
          <p>
            Erstellen des gewünschten Materials und Betrieb von Website und App: Art. 6 Abs. 1 lit. b DSGVO
            (Bereitstellung des Dienstes, den du nutzt). Sicherheits-Logs, Begrenzung von Anfragen und Auswertung
            von Bewertungen zur Qualitätsverbesserung: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem
            sicheren, funktionierenden Dienst). Google Analytics auf der Website: nur mit deiner Einwilligung,
            Art. 6 Abs. 1 lit. a DSGVO.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">13. Kinder und Jugendliche</h2>
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
          <h2 className="mb-1 font-semibold text-white">14. Deine Rechte</h2>
          <p>
            Je nach Rechtsordnung hast du das Recht auf Auskunft, Berichtigung, Löschung oder Widerspruch
            gegen die Verarbeitung deiner personenbezogenen Daten, das Recht, eine Einwilligung jederzeit zu
            widerrufen, sowie das Recht auf Beschwerde bei einer Datenschutz-Aufsichtsbehörde. Schreib uns dazu an
            hello@paper-punch.com. Für uns zuständig ist die Sächsische Datenschutz- und Transparenzbeauftragte,
            Devrientstraße 5, 01067 Dresden.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-white">15. Änderungen dieser Erklärung</h2>
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
