"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useLanguage } from "@/lib/i18n/language-context";
import { AppIcon, Pixels, RecommendButton, useAppText } from "./ui";

// Die App ist noch im geschlossenen Test – die Karte führt zur Infoseite mit Beta-Anmeldung.
const ANDROID_INFO = "/about";

function Brand() {
  return (
    <Link href="/app" className="flex items-center gap-2 text-[17px] font-extrabold tracking-tight">
      <Pixels />
      <span>
        Paper<span className="text-[#1fd6ea]">Punch</span>
      </span>
    </Link>
  );
}

/** Rahmen der Web-App: am Computer Seitenleiste links, am Handy Kopfzeile mit Menü. */
export function AppShell({ children }: { children: ReactNode }) {
  const tx = useAppText();
  const { locale, setLocale } = useLanguage();
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const nav = [
    { href: "/app", icon: "home", label: tx.overview },
    { href: "/app/materials", icon: "folder", label: tx.materials },
    { href: "/app/plans", icon: "calendar", label: tx.plans },
  ];
  const active = (href: string) => (href === "/app" ? pathname === "/app" : pathname.startsWith(href));

  const links = (
    <>
      {nav.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          onClick={() => setMenu(false)}
          className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 text-[15px] font-bold ${active(n.href) ? "bg-[#15171b] text-zinc-100 ring-1 ring-white/[0.06]" : "text-zinc-400 hover:text-zinc-100"}`}
        >
          <AppIcon name={n.icon} />
          {n.label}
        </Link>
      ))}
      <RecommendButton className="flex items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-[15px] font-bold text-zinc-400 hover:text-zinc-100" />
    </>
  );

  const langSwitch = (
    <div className="flex gap-1 rounded-full bg-[#15171b] p-1 ring-1 ring-white/[0.06]">
      {(["de", "en"] as const).map((l) => (
        <button key={l} type="button" onClick={() => setLocale(l)} className={`h-8 rounded-full px-3 text-xs font-extrabold uppercase ${locale === l ? "bg-zinc-100 text-zinc-950" : "text-zinc-400"}`}>
          {l}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex min-h-dvh w-full bg-[#0b0c0f] text-zinc-100">
      <aside className="sticky top-0 hidden h-dvh w-[250px] flex-none flex-col gap-1.5 border-r border-[#1d2026] px-[18px] py-6 lg:flex">
        <div className="px-1.5 pb-5"><Brand /></div>
        {links}
        <div className="mt-auto flex flex-col gap-3">
          {langSwitch}
          <Link href={ANDROID_INFO} className="flex flex-col gap-1 rounded-2xl bg-[#15171b] p-3.5 ring-1 ring-white/[0.06]">
            <b className="text-sm">{tx.android}</b>
            <span className="text-xs font-semibold leading-snug text-zinc-400">{tx.androidSub}</span>
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between px-4 lg:hidden">
          <Brand />
          <button type="button" aria-label={menu ? tx.close : tx.menu} onClick={() => setMenu((m) => !m)} className="grid h-11 w-11 place-items-center rounded-full bg-[#15171b] ring-1 ring-white/[0.06]">
            <AppIcon name={menu ? "close" : "menu"} />
          </button>
        </header>
        {menu && (
          <div className="flex flex-col gap-1.5 border-b border-[#1d2026] px-4 pb-4 lg:hidden">
            {links}
            <div className="pt-2">{langSwitch}</div>
          </div>
        )}
        <main className="mx-auto flex w-full max-w-[1000px] flex-1 flex-col px-4 pb-8 lg:px-11 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
