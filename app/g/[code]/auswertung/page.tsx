import type { Metadata } from "next";
import { TeacherReportView } from "@/components/group/TeacherReport";

// Auswertung einer Lerngruppe für die Lehrkraft. Der Schlüssel steht im Link hinter dem # und wird nur
// im Browser gelesen – die Seite selbst enthält keine Daten.

export const metadata: Metadata = {
  title: "PaperPunch – Auswertung der Lerngruppe",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function TeacherReportPage({ params }: PageProps<"/g/[code]/auswertung">) {
  const { code } = await params;
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <TeacherReportView code={code} />
    </main>
  );
}
