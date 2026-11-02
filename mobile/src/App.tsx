import { useCallback, useEffect, useRef, useState } from "react";
import { DICTS, LangProvider, deviceLang } from "./i18n";
import { loadPlan, loadPlanFiles, loadProfile, savePlan, saveProfile } from "./storage";
import { adjustPlan, ApiError, generateMaterial } from "./api";
import { daysBetween, todayISO } from "./dates";
import type { ActivePlan, GameResult, GenerateResult, MaterialFormat, Profile, QuizOutcome, StoredSession } from "./types";
import { Onboarding } from "./screens/Onboarding";
import { Home } from "./screens/Home";
import { Capture } from "./screens/Capture";
import { Working } from "./screens/Working";
import { Result } from "./screens/Result";
import { Quiz } from "./screens/Quiz";
import { PlanSetup } from "./screens/PlanSetup";
import { PlanView } from "./screens/PlanView";
import { Toast } from "./ui";

/** Wenn Material aus einer Plan-Einheit stammt, merkt sich die App die Einheit. */
export interface SessionRef {
  session: StoredSession;
}

type View =
  | { name: "onboarding" }
  | { name: "settings" }
  | { name: "home" }
  | { name: "capture"; mode: "photo" | "topic" }
  | { name: "working"; format: MaterialFormat | "plan" | "adjust"; fileCount: number }
  | { name: "result"; result: GenerateResult; from?: SessionRef }
  | { name: "quiz"; game: GameResult["game"]; from?: SessionRef; result?: GenerateResult }
  | { name: "planSetup" }
  | { name: "plan" };

export function App() {
  const [profile, setProfile] = useState<Profile | null>(() => loadProfile());
  const [plan, setPlanState] = useState<ActivePlan | null>(() => loadPlan());
  const [view, setView] = useState<View>(() => (loadProfile() ? { name: "home" } : { name: "onboarding" }));
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number>();

  const lang = profile?.lang ?? deviceLang();
  const t = DICTS[lang];

  const say = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 3200);
  }, []);

  const setPlan = useCallback((next: ActivePlan | null) => {
    setPlanState(next);
    savePlan(next);
  }, []);

  // Android-Zurück-Taste und Browser-Zurück führen zur Startseite statt die App zu schließen.
  useEffect(() => {
    const onPop = () => setView((v) => (v.name === "home" || v.name === "onboarding" ? v : { name: "home" }));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    if (view.name !== "home" && view.name !== "onboarding") window.history.pushState(null, "");
  }, [view.name]);

  function errorText(error: unknown) {
    if (error instanceof ApiError) return error.network ? t.errNetwork : error.message || t.errGeneric;
    return t.errGeneric;
  }

  async function runGenerate(opts: { format: MaterialFormat; files: File[]; subject?: string; notes?: string; from?: SessionRef; back: View }) {
    if (!profile) return;
    setView({ name: "working", format: opts.format, fileCount: opts.files.length });
    try {
      const result = await generateMaterial({ profile, ...opts });
      if (result.format === "game" && opts.from?.session.kind === "checkpoint") {
        setView({ name: "quiz", game: result.game, from: opts.from });
      } else {
        setView({ name: "result", result, from: opts.from });
      }
    } catch (error) {
      say(errorText(error));
      setView(opts.back);
    }
  }

  function markDone(sessionId: string, outcome?: QuizOutcome) {
    if (!plan) return;
    setPlan({
      ...plan,
      done: plan.done.includes(sessionId) ? plan.done : [...plan.done, sessionId],
      results: outcome ? { ...plan.results, [sessionId]: outcome } : plan.results,
    });
  }

  async function startSession(session: StoredSession) {
    if (!plan) return;
    const files = plan.hasFiles ? await loadPlanFiles() : [];
    await runGenerate({
      format: session.format,
      files,
      subject: plan.goal.subject,
      notes: session.focus,
      from: { session },
      back: { name: "plan" },
    });
  }

  async function finishCheckpoint(session: StoredSession, outcome: QuizOutcome) {
    if (!plan || !profile) return;
    const updated: ActivePlan = {
      ...plan,
      done: [...plan.done.filter((id) => id !== session.id), session.id],
      results: { ...plan.results, [session.id]: outcome },
    };
    setPlan(updated);
    const todayIndex = daysBetween(updated.startDate, todayISO());
    if (todayIndex >= daysBetween(updated.startDate, updated.goal.testDate) - 1) {
      setView({ name: "plan" });
      return;
    }
    setView({ name: "working", format: "adjust", fileCount: 0 });
    try {
      const revised = await adjustPlan({
        profile,
        goal: updated.goal,
        startDate: updated.startDate,
        plan: { ...updated.plan, sessions: updated.sessions },
        checkpointTitle: session.title,
        outcome,
      });
      // Erledigte und heutige Einheiten bleiben, ab morgen gilt der neue Plan.
      const kept = updated.sessions.filter((s) => s.dayIndex <= todayIndex);
      const fresh = revised.sessions.map((s, i) => ({ ...s, id: `${s.dayIndex}-${Date.now()}-${i}` }));
      const { sessions: _ignored, ...meta } = revised;
      setPlan({ ...updated, plan: meta, sessions: [...kept, ...fresh] });
      say(`${t.adjusted}: ${revised.feasibilityNote}`);
    } catch (error) {
      say(errorText(error));
    }
    setView({ name: "plan" });
  }

  let screen: JSX.Element;
  switch (view.name) {
    case "onboarding":
    case "settings":
      screen = (
        <Onboarding
          initial={profile}
          isSettings={view.name === "settings"}
          onSave={(p) => {
            setProfile(p);
            saveProfile(p);
            setView({ name: "home" });
          }}
          onBack={() => setView({ name: "home" })}
        />
      );
      break;
    case "home":
      screen = (
        <Home
          plan={plan}
          onQuick={() => setView({ name: "capture", mode: "photo" })}
          onPlan={() => setView(plan ? { name: "plan" } : { name: "planSetup" })}
          onSettings={() => setView({ name: "settings" })}
        />
      );
      break;
    case "capture":
      screen = (
        <Capture
          profile={profile!}
          initialMode={view.mode}
          say={say}
          onBack={() => setView({ name: "home" })}
          onCreate={(format, files, topic, p) => {
            if (p.grade !== profile!.grade || p.schoolType !== profile!.schoolType) {
              setProfile(p);
              saveProfile(p);
            }
            void runGenerate({ format, files, subject: topic || undefined, back: { name: "capture", mode: view.mode } });
          }}
        />
      );
      break;
    case "working":
      screen = <Working format={view.format} fileCount={view.fileCount} />;
      break;
    case "result":
      screen = (
        <Result
          result={view.result}
          from={view.from}
          say={say}
          onPlay={(game) => setView({ name: "quiz", game, from: view.from, result: view.result })}
          onDone={() => {
            if (view.from) {
              markDone(view.from.session.id);
              setView({ name: "plan" });
            } else setView({ name: "capture", mode: "photo" });
          }}
          onNew={() => setView(view.from ? { name: "plan" } : { name: "capture", mode: "photo" })}
          onHome={() => setView({ name: "home" })}
        />
      );
      break;
    case "quiz":
      screen = (
        <Quiz
          game={view.game}
          checkpoint={view.from?.session.kind === "checkpoint"}
          inPlan={!!view.from}
          onClose={() => setView(view.from ? { name: "plan" } : view.result ? { name: "result", result: view.result } : { name: "home" })}
          onFinish={(outcome) => {
            if (!view.from) return;
            if (view.from.session.kind === "checkpoint") void finishCheckpoint(view.from.session, outcome);
            else {
              markDone(view.from.session.id, outcome);
              setView({ name: "plan" });
            }
          }}
        />
      );
      break;
    case "planSetup":
      screen = (
        <PlanSetup
          profile={profile!}
          say={say}
          errorText={errorText}
          onBack={() => setView({ name: "home" })}
          onCreated={(p) => {
            setPlan(p);
            setView({ name: "plan" });
          }}
        />
      );
      break;
    case "plan":
      screen = plan ? (
        <PlanView
          active={plan}
          onBack={() => setView({ name: "home" })}
          onStart={(s) => void startSession(s)}
          onToggleDone={(id) =>
            setPlan({ ...plan, done: plan.done.includes(id) ? plan.done.filter((d) => d !== id) : [...plan.done, id] })
          }
          onDelete={() => {
            setPlan(null);
            setView({ name: "home" });
          }}
          onNew={() => {
            setPlan(null);
            setView({ name: "planSetup" });
          }}
        />
      ) : (
        <Home plan={null} onQuick={() => setView({ name: "capture", mode: "photo" })} onPlan={() => setView({ name: "planSetup" })} onSettings={() => setView({ name: "settings" })} />
      );
      break;
  }

  return (
    <LangProvider lang={lang}>
      {screen}
      {toast && <Toast text={toast} />}
    </LangProvider>
  );
}
