"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CreationWizard } from "@/components/wizard/CreationWizard";
import { useLanguage } from "@/lib/i18n/language-context";
import { deleteMaterial, getMaterial, listMaterials, type WebMaterial } from "@/lib/webapp/store";
import { AppIcon, useAppText } from "./ui";
import { relDate } from "./util";

/** Meine Materialien (im Browser gespeichert); mit ?id= öffnet sich ein Material direkt im Ergebnis. */
export function AppMaterials({ id }: { id?: string }) {
  const tx = useAppText();
  const { locale } = useLanguage();
  const router = useRouter();
  const [list, setList] = useState<WebMaterial[] | null>(null);
  const [open, setOpen] = useState<WebMaterial | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setList(listMaterials());
    setOpen(id ? getMaterial(id) ?? null : null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [id]);

  if (id && open) {
    return (
      <div>
        <div className="mb-4 mt-2 flex items-center gap-3 lg:mt-0">
          <Link href="/app/materials" aria-label={tx.back} className="grid h-11 w-11 place-items-center rounded-full bg-[#15171b] ring-1 ring-white/[0.06]"><AppIcon name="back" /></Link>
          <span className="flex min-w-0 flex-col">
            <span className="text-xs font-bold text-zinc-500">{tx.formats[open.format]} · {relDate(open.createdAt, locale, tx)}</span>
            <h1 className="truncate text-2xl font-extrabold tracking-tight">{open.title}</h1>
          </span>
        </div>
        <CreationWizard key={open.id} saved={open} onNew={() => router.push("/app")} />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mx-1 mb-5 mt-6 text-[30px] font-extrabold tracking-tight lg:mx-0 lg:mt-1">{tx.materials}</h1>
      {list && list.length === 0 && (
        <div className="flex flex-col items-start gap-4 rounded-3xl bg-[#15171b] p-5 ring-1 ring-white/[0.06]">
          <p className="font-semibold text-zinc-400">{tx.emptyMaterials}</p>
          <Link href="/app/new?mode=upload" className="rounded-2xl bg-[#1fd6ea] px-5 py-3 font-extrabold text-black">{tx.upload}</Link>
        </div>
      )}
      <div className="flex flex-col gap-2">
        {list?.map((m) => (
          <div key={m.id} className="flex items-center gap-3 rounded-2xl bg-[#15171b] p-3.5 ring-1 ring-white/[0.06]">
            <Link href={`/app/materials?id=${m.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <span className="h-[34px] w-1.5 flex-none rounded-sm bg-[#1fd6ea]" />
              <span className="flex min-w-0 flex-col">
                <b className="truncate">{m.title}</b>
                <span className="text-xs font-semibold text-zinc-500">{tx.formats[m.format]} · {relDate(m.createdAt, locale, tx)}</span>
              </span>
            </Link>
            <button
              type="button"
              aria-label={`${m.title} ${tx.delete}`}
              onClick={() => {
                deleteMaterial(m.id);
                setList(listMaterials());
              }}
              className="grid h-10 w-10 place-items-center rounded-full text-zinc-500 hover:text-zinc-100"
            >
              <AppIcon name="trash" size={18} />
            </button>
          </div>
        ))}
      </div>
      <p className="mt-6 text-center text-[11px] font-semibold text-zinc-500">{tx.localNote}</p>
    </div>
  );
}
