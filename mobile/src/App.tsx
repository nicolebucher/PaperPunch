import { useCallback, useEffect, useRef, useState } from "react";
import { DICTS, LangProvider, deviceLang } from "./i18n";
import { clearPlanFiles, loadPlanFiles, loadPlans, loadProfile, savePlans, saveProfile } from "./storage";
import { adjustPlan, ApiError, generateMaterial } from "./api";
import { daysBetween, todayISO } from "./dates";
import type { ActivePlan, GameResult, GenerateResult, MaterialFormat, Profile, QuizOutcome, StoredSession } from "./types";
import { Onboarding } from "./screens/Onboarding";
import { Home } from "./screens/Home";
import { Capture } from "./screens/Capture";
import { Working } from "./screens/Working";
import { Result } from "./screens/Result";
import { Quiz } from "./screens/Quiz";
import { Practice } from "./screens/Practice";
import { PlanSetup } from "./screens/PlanSetup";
import { PlanView } from "./screens/PlanView";
import { GoHomeContext, Toast } from "./ui";

/** Wenn Material aus einer Plan-Einheit stammt, merkt sich die App die Einheit. */
export interface SessionRef {
  planId: string;
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
  | { name: "practice"; result: GenerateResult & { format: "worksheet" | "test" }; from?: SessionRef }
  | { name: "planSetup" }
  | { name: "plan"; planId: string };

export function App() {
  const [profile, setProfile] = useState<Profile | null>(() => loadProfile());
  const [plans, setPlansState] = useState<ActivePlan[]>(() => loadPlans());
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

  const setPlans = useCallback((next: ActivePlan[]) => {
    setPlansState(next);
    savePlans(next);
  }, []);
  const getPlan = (id: string) => plans.find((p) => p.id === id) ?? null;
  // Aktualisiert einen Plan anhand des neuesten gespeicherten Stands (auch nach await sicher).
  const updatePlan = useCallback((id: string, change: (p: ActivePlan) => ActivePlan) => {
    setPlansState((current) => {
      const next = current.map((p) => (p.id === id ? change(p) : p));
      savePlans(next);
      return next;
    });
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

  const goHome = useCallback(() => setView({ name: "home" }), []);

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

  function markDone(planId: string, sessionId: string, outcome?: QuizOutcome) {
    updatePlan(planId, (plan) => ({
      ...plan,
      done: plan.done.includes(sessionId) ? plan.done : [...plan.done, sessionId],
      results: outcome ? { ...plan.results, [sessionId]: outcome } : plan.results,
    }));
  }

  async function startSession(planId: string, session: StoredSession) {
    const plan = getPlan(planId);
    if (!plan) return;
    const files = plan.hasFiles ? await loadPlanFiles(plan.id) : [];
    await runGenerate({
      format: session.format,
      files,
      subject: plan.goal.subject,
      notes: session.focus,
      from: { planId, session },
      back: { name: "plan", planId },
    });
  }

  async function finishCheckpoint(planId: string, session: StoredSession, outcome: QuizOutcome) {
    const plan = getPlan(planId);
    if (!plan || !profile) return;
    const updated: ActivePlan = {
      ...plan,
      done: [...plan.done.filter((id) => id !== session.id), session.id],
      results: { ...plan.results, [session.id]: outcome },
    };
    updatePlan(planId, () => updated);
    const todayIndex = daysBetween(updated.startDate, todayISO());
    if (todayIndex >= daysBetween(updated.startDate, updated.goal.testDate) - 1) {
      setView({ name: "plan", planId });
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
      updatePlan(planId, (p) => ({ ...p, plan: meta, sessions: [...kept, ...fresh] }));
      say(`${t.adjusted}: ${revised.feasibilityNote}`);
    } catch (error) {
      say(errorText(error));
    }
    setView({ name: "plan", planId });
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
          plans={plans}
          onQuick={() => setView({ name: "capture", mode: "photo" })}
          onOpenPlan={(planId) => setView({ name: "plan", planId })}
          onNewPlan={() => setView({ name: "planSetup" })}
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
          onPractice={() => {
            if (view.result.format === "worksheet" || view.result.format === "test") setView({ name: "practice", result: view.result, from: view.from });
          }}
          onDone={() => {
            if (view.from) {
              markDone(view.from.planId, view.from.session.id);
              setView({ name: "plan", planId: view.from.planId });
            } else setView({ name: "capture", mode: "photo" });
          }}
          onNew={() => setView(view.from ? { name: "plan", planId: view.from.planId } : { name: "capture", mode: "photo" })}
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
          onClose={() => setView(view.from ? { name: "plan", planId: view.from.planId } : view.result ? { name: "result", result: view.result } : { name: "home" })}
          onFinish={(outcome) => {
            const from = view.from;
            if (!from) return;
            if (from.session.kind === "checkpoint") void finishCheckpoint(from.planId, from.session, outcome);
            else {
              markDone(from.planId, from.session.id, outcome);
              setView({ name: "plan", planId: from.planId });
            }
          }}
        />
      );
      break;
    case "practice":
      screen = (
        <Practice
          title={view.result.data.title}
          tasks={view.result.data.tasks}
          onClose={() => setView({ name: "result", result: view.result, from: view.from })}
          onFinish={(outcome) => {
            if (view.from) {
              markDone(view.from.planId, view.from.session.id, outcome);
              setView({ name: "plan", planId: view.from.planId });
            } else {
              say(`${outcome.correct}/${outcome.total} ${t.score}`);
              setView({ name: "result", result: view.result });
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
            setPlans([p, ...plans]);
            setView({ name: "plan", planId: p.id });
          }}
        />
      );
      break;
    case "plan": {
      const plan = getPlan(view.planId);
      screen = plan ? (
        <PlanView
          active={plan}
          onBack={() => setView({ name: "home" })}
          onStart={(sess) => void startSession(plan.id, sess)}
          onToggleDone={(id) =>
            updatePlan(plan.id, (p) => ({ ...p, done: p.done.includes(id) ? p.done.filter((d) => d !== id) : [...p.done, id] }))
          }
          onDelete={() => {
            void clearPlanFiles(plan.id);
            setPlans(plans.filter((p) => p.id !== plan.id));
            setView({ name: "home" });
          }}
          onNew={() => setView({ name: "planSetup" })}
        />
      ) : (
        <Home
          plans={plans}
          onQuick={() => setView({ name: "capture", mode: "photo" })}
          onOpenPlan={(planId) => setView({ name: "plan", planId })}
          onNewPlan={() => setView({ name: "planSetup" })}
          onSettings={() => setView({ name: "settings" })}
        />
      );
      break;
    }
  }

  return (
    <LangProvider lang={lang}>
      <GoHomeContext.Provider value={view.name === "onboarding" || view.name === "working" ? null : goHome}>
        {screen}
      </GoHomeContext.Provider>
      {toast && <Toast text={toast} />}
    </LangProvider>
  );
}
