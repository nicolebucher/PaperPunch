"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n/language-context";
import { saveMaterial, type WebMaterial } from "@/lib/webapp/store";
import { useAppText } from "./ui";

/**
 * "Wie fandest du das Material?" wie in der App: 5 Sterne, danach optional Text.
 * Geht an /api/rating (Google Sheet + privater Speicher); pro Material nur einmal.
 */
export function RatingCard({ material }: { material: WebMaterial }) {
  const tx = useAppText();
  const { locale } = useLanguage();
  const [stars, setStars] = useState(0);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);

  if (material.rating && !sent) return null;

  function send() {
    setSent(true);
    saveMaterial({ ...material, rating: stars });
    let profile: { grade?: string; schoolType?: string } = {};
    try {
      profile = JSON.parse(localStorage.getItem("paperpunch-web-profile") ?? "{}");
    } catch {
      // ohne Profil
    }
    const grade = Number.parseInt(profile.grade ?? "", 10);
    void fetch("/api/rating", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stars,
        text: text.trim(),
        format: material.format,
        title: material.title.slice(0, 200),
        ...(material.subject ? { subject: material.subject.slice(0, 80) } : {}),
        lang: locale,
        ...(profile.schoolType ? { schoolType: profile.schoolType.slice(0, 80) } : {}),
        ...(Number.isFinite(grade) ? { grade } : {}),
        source: "web",
      }),
    }).catch(() => undefined);
  }

  if (sent) {
    return <p role="status" className="mt-5 rounded-[22px] bg-[#15171b] p-4 text-center text-sm font-extrabold text-[#1fd6ea] ring-1 ring-white/[0.06]">{tx.rateThanks}</p>;
  }

  return (
    <div className="mt-5 flex flex-col items-center gap-3 rounded-[22px] bg-[#15171b] p-4 ring-1 ring-white/[0.06]">
      <span className="text-[15px] font-extrabold">{tx.rateQuestion}</span>
      <div className="flex gap-1.5" role="radiogroup" aria-label={tx.rateQuestion}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={stars === n}
            aria-label={tx.rateStars(n)}
            onClick={() => setStars(n)}
            className={`grid h-11 w-11 place-items-center rounded-full text-[28px] leading-none transition ${n <= stars ? "text-yellow-300" : "text-zinc-600 hover:text-zinc-400"}`}
          >
            ★
          </button>
        ))}
      </div>
      {stars > 0 && (
        <div className="flex w-full flex-col gap-2.5">
          <label className="flex flex-col gap-1.5 text-xs font-extrabold text-zinc-400">
            {stars <= 3 ? tx.rateWhatWrong : tx.rateWhatGood}
            <textarea
              value={text}
              maxLength={1000}
              rows={3}
              placeholder={tx.rateOptional}
              onChange={(e) => setText(e.target.value)}
              className="rounded-xl border border-zinc-700 bg-black px-4 py-3 text-base font-semibold text-zinc-100 outline-none focus:border-[#1fd6ea]"
            />
          </label>
          <button type="button" onClick={send} className="rounded-2xl bg-[#1fd6ea] px-5 py-3.5 font-extrabold text-black">
            {tx.rateSend}
          </button>
        </div>
      )}
    </div>
  );
}
