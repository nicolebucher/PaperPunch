"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreationWizard } from "@/components/wizard/CreationWizard";
import { getPlan, saveMaterial, savePlan } from "@/lib/webapp/store";
import type { OutputFormat } from "@/types/generation";
import { AppIcon, useAppText } from "./ui";

/** Neues Material in der Web-App: hochladen oder Thema eintippen; Ergebnis wird im Browser gespeichert. */
export function AppNew({ mode, topic, notes, format, planId, session }: { mode: "upload" | "topic"; topic?: string; notes?: string; format?: OutputFormat; planId?: string; session?: number }) {
  const tx = useAppText();
  const router = useRouter();
  return (
    <div>
      <div className="mb-4 mt-2 flex items-center gap-3 lg:mt-0">
        <Link href={planId ? `/app/plans?id=${planId}` : "/app"} aria-label={tx.back} className="grid h-11 w-11 place-items-center rounded-full bg-[#15171b] ring-1 ring-white/[0.06]">
          <AppIcon name="back" />
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight lg:text-3xl">{mode === "topic" ? tx.topicHeading : tx.uploadHeading}</h1>
      </div>
      <CreationWizard
        mode={mode}
        initialSubject={topic}
        initialNotes={notes}
        initialFormat={format}
        onSaved={(m) => {
          saveMaterial(m);
          // Aus einem Lernplan gestartet: Einheit als erledigt markieren.
          if (planId && session !== undefined) {
            const p = getPlan(planId);
            if (p && !p.done.includes(session)) savePlan({ ...p, done: [...p.done, session] });
          }
        }}
        onNew={() => router.push("/app")}
      />
    </div>
  );
}
