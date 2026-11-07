import type { Metadata } from "next";
import Link from "next/link";
import { readChallenge } from "@/lib/challenges";
import { ChallengePlay } from "@/components/challenge/ChallengePlay";
import { ReportContentLink } from "@/components/share/ReportContentLink";

// Challenge-Links werden nie vorab gebaut, sondern bei jedem Aufruf frisch aus dem Speicher gelesen.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/c/[code]">): Promise<Metadata> {
  const { code } = await params;
  const challenge = await readChallenge(code).catch(() => null);
  if (!challenge) return { title: "PaperPunch Challenge" };
  const de = challenge.lang === "de";
  const title = de ? `${challenge.from.name} fordert dich heraus ⚔️` : `${challenge.from.name} challenges you ⚔️`;
  const description =
    challenge.from.pct !== undefined
      ? de
        ? `${challenge.game.gameTitle} · ${challenge.from.pct} % richtig – schaffst du mehr?`
        : `${challenge.game.gameTitle} · ${challenge.from.pct}% correct – can you beat it?`
      : challenge.game.gameTitle;
  return { title, description, openGraph: { title, description }, robots: { index: false } };
}

export default async function ChallengePage({ params }: PageProps<"/c/[code]">) {
  const { code } = await params;
  const challenge = await readChallenge(code).catch(() => null);
  if (!challenge) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Challenge nicht gefunden · Challenge not found</h1>
        <p className="text-zinc-400">
          Der Link ist abgelaufen (nach 30 Tagen) oder falsch. · The link has expired (after 30 days) or is wrong.
        </p>
        <Link href="/" className="rounded-full bg-brand-400 px-6 py-3 font-semibold text-black">
          PaperPunch
        </Link>
      </main>
    );
  }
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <ChallengePlay challenge={challenge} />
      <ReportContentLink kind="challenge" code={challenge.code} lang={challenge.lang} />
    </main>
  );
}
