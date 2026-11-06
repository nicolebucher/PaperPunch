import type { Metadata } from "next";
import Link from "next/link";
import { readGroup } from "@/lib/groups";
import { GroupPlay } from "@/components/group/GroupPlay";
import { ReportContentLink } from "@/components/share/ReportContentLink";

// Lerngruppen-Links werden bei jedem Aufruf frisch gelesen.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/g/[code]">): Promise<Metadata> {
  const { code } = await params;
  const group = await readGroup(code).catch(() => null);
  if (!group) return { title: "PaperPunch Lerngruppe" };
  const de = group.lang === "de";
  const title = group.homework ? (de ? `Hausaufgabe „${group.name}“ 📚` : `Homework “${group.name}” 📚`) : de ? `Lerngruppe „${group.name}“ 👥` : `Study group “${group.name}” 👥`;
  const description = de ? `Wer schafft am meisten in „${group.game.gameTitle}“? Ohne Anmeldung mitspielen.` : `Who gets the most right in “${group.game.gameTitle}”? Join without signing up.`;
  return { title, description, openGraph: { title, description }, robots: { index: false } };
}

export default async function GroupPage({ params }: PageProps<"/g/[code]">) {
  const { code } = await params;
  const group = await readGroup(code).catch(() => null);
  if (!group) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Lerngruppe nicht gefunden · Study group not found</h1>
        <p className="text-zinc-400">Der Link ist abgelaufen oder falsch. · The link has expired or is wrong.</p>
        <Link href="/" className="rounded-full bg-brand-400 px-6 py-3 font-semibold text-black">PaperPunch</Link>
      </main>
    );
  }
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <GroupPlay code={group.code} name={group.name} lang={group.lang} endsAt={group.endsAt} game={group.game} homework={!!group.homework} />
      <ReportContentLink kind="group" code={group.code} lang={group.lang} />
    </main>
  );
}
