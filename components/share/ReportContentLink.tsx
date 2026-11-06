// "Inhalt melden" unter öffentlich geteilten Spielen (Challenges, Lerngruppen): öffnet eine E-Mail an
// hello@paper-punch.com mit dem Code, damit unangemessene Inhalte schnell gefunden und gelöscht werden können.

export function ReportContentLink({ kind, code, lang }: { kind: "challenge" | "group"; code: string; lang: "de" | "en" }) {
  const de = lang === "de";
  const what = kind === "challenge" ? "Challenge" : de ? "Lerngruppe" : "Study group";
  const subject = `${de ? "Meldung" : "Report"}: ${what} ${code}`;
  const body = de
    ? `Was ist an diesem Inhalt nicht in Ordnung?\n\nLink: https://paper-punch.com/${kind === "challenge" ? "c" : "g"}/${code}\n`
    : `What is wrong with this content?\n\nLink: https://paper-punch.com/${kind === "challenge" ? "c" : "g"}/${code}\n`;
  const href = `mailto:hello@paper-punch.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return (
    <p className="mt-10 text-center text-xs text-zinc-500">
      <a href={href} className="underline underline-offset-2 hover:text-zinc-300">
        {de ? "Unangemessenen Inhalt melden" : "Report inappropriate content"}
      </a>
    </p>
  );
}
