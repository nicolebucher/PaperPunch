"use client";

import { track } from "@/lib/analytics";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/language-context";
import { deleteMaterial, getMaterial, listMaterials, saveMaterial, type WebMaterial } from "@/lib/webapp/store";
import { AppIcon, useAppText } from "./ui";
import { relDate } from "./util";
import { ResultView } from "./ResultView";

/** Meine Materialien (im Browser gespeichert); mit ?id= öffnet sich ein Material direkt im Ergebnis. */
export function AppMaterials({ id }: { id?: string }) {
  const tx = useAppText();
  const { locale } = useLanguage();
  const [list, setList] = useState<WebMaterial[] | null>(null);
  const [open, setOpen] = useState<WebMaterial | null>(null);
  const [menu, setMenu] = useState(false);
  // Löschen ohne Rückfrage – 5 Sekunden "Rückgängig". Aus der Detailansicht über sessionStorage an die Liste übergeben.
  const [undo, setUndo] = useState<WebMaterial | null>(null);
  const undoTimer = useRef<number | undefined>(undefined);
  const router = useRouter();

  function offerUndo(m: WebMaterial) {
    setUndo(m);
    window.clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => setUndo(null), 5000);
  }

  function remove(m: WebMaterial) {
    deleteMaterial(m.id);
    track("material_deleted", { format: m.format });
    setList(listMaterials());
    offerUndo(m);
  }

  function restore() {
    if (!undo) return;
    saveMaterial(undo);
    setList(listMaterials());
    setUndo(null);
    track("material_restored", { format: undo.format });
  }

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setList(listMaterials());
    setOpen(id ? getMaterial(id) ?? null : null);
    setMenu(false);
    if (!id) {
      try {
        const raw = sessionStorage.getItem("pp-undo-material");
        sessionStorage.removeItem("pp-undo-material");
        if (raw) offerUndo(JSON.parse(raw) as WebMaterial);
      } catch {
        // ohne Speicher kein Rückgängig
      }
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [id]);

  const undoToast = undo && (
    <div className="fixed inset-x-4 bottom-6 z-40 mx-auto flex max-w-md items-center justify-between gap-4 rounded-2xl bg-zinc-100 px-4 py-3 text-[15px] font-bold text-zinc-950 shadow-2xl lg:left-[250px]" role="status">
      <span className="min-w-0 truncate">{tx.deletedUndo(undo.title)}</span>
      <button type="button" onClick={restore} className="font-extrabold text-[#0b7f8d]">{tx.undo}</button>
    </div>
  );

  if (id && open) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="mb-2 mt-2 flex items-center gap-3 lg:mt-0">
          <Link href="/app/materials" aria-label={tx.back} className="grid h-11 w-11 place-items-center rounded-full bg-[#15171b] ring-1 ring-white/[0.06]"><AppIcon name="back" /></Link>
          <span className="text-xs font-bold text-zinc-500">{tx.formats[open.format]} · {relDate(open.createdAt, locale, tx)}</span>
          <div className="relative ml-auto">
            <button type="button" onClick={() => setMenu((v) => !v)} aria-label={tx.moreActions} aria-expanded={menu} className="grid h-11 w-11 place-items-center rounded-full bg-[#15171b] text-lg font-black tracking-widest text-zinc-300 ring-1 ring-white/[0.06]">⋯</button>
            {menu && (
              <>
                <button type="button" aria-label={tx.back} className="fixed inset-0 z-20 cursor-default" onClick={() => setMenu(false)} />
                <div role="menu" className="absolute right-0 top-12 z-30 min-w-[200px] rounded-2xl bg-[#15171b] p-1.5 shadow-2xl ring-1 ring-white/[0.08]">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      deleteMaterial(open.id);
                      track("material_deleted", { format: open.format, from: "detail" });
                      try {
                        sessionStorage.setItem("pp-undo-material", JSON.stringify(open));
                      } catch {
                        // ohne Speicher kein Rückgängig
                      }
                      router.push("/app/materials");
                    }}
                    className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-[15px] font-extrabold text-orange-400 hover:bg-white/5"
                  >
                    <AppIcon name="trash" size={18} /> {tx.deleteThis}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        <ResultView key={open.id} material={open} />
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
              onClick={() => remove(m)}
              className="grid h-10 w-10 place-items-center rounded-full text-zinc-500 hover:text-zinc-100"
            >
              <AppIcon name="trash" size={18} />
            </button>
          </div>
        ))}
      </div>
      <p className="mt-6 text-center text-[11px] font-semibold text-zinc-500">{tx.localNote}</p>
      {undoToast}
    </div>
  );
}
