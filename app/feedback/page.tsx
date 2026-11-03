"use client";

import { useState, type FormEvent } from "react";
import { useLanguage } from "@/lib/i18n/language-context";

export default function FeedbackPage() {
  const { t, locale } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("sending");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, locale }),
      });
      if (!response.ok) throw new Error();
      setStatus("sent");
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="mx-auto max-w-xl flex-1 px-4 py-16">
      <h1 className="mb-2 text-2xl font-bold">{t.feedback.heading}</h1>
      <p className="mb-2 text-sm text-zinc-400">{t.feedback.description}</p>
      <p className="mb-6 text-sm text-zinc-400">
        {t.about.emailLabel}{" "}
        <a href="mailto:hello@paper-punch.com" className="font-semibold text-brand-400 hover:text-brand-300">
          hello@paper-punch.com
        </a>
      </p>

      {status === "sent" ? (
        <p className="rounded-lg bg-brand-400/10 p-4 text-sm text-brand-300">{t.feedback.success}</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium">
            {t.feedback.nameLabel}
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            {t.feedback.emailLabel}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            {t.feedback.requestLabel}
            <textarea
              required
              minLength={3}
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t.feedback.requestPlaceholder}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
            />
          </label>
          {status === "error" && <p className="text-sm text-red-400">{t.feedback.error}</p>}
          <button
            type="submit"
            disabled={status === "sending"}
            className="rounded-full bg-brand-400 px-6 py-3 font-medium text-black hover:bg-brand-300 disabled:opacity-50"
          >
            {t.feedback.submit}
          </button>
        </form>
      )}
    </main>
  );
}
