import { AppNew } from "@/components/webapp/AppNew";
import { outputFormats, type OutputFormat } from "@/types/generation";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AppNewPage({ searchParams }: PageProps<"/app/new">) {
  const sp = await searchParams;
  const mode = one(sp.mode) === "topic" ? "topic" : "upload";
  const formatParam = one(sp.format);
  const format = (outputFormats as readonly string[]).includes(formatParam ?? "") ? (formatParam as OutputFormat) : undefined;
  const sessionParam = one(sp.session);
  return (
    <AppNew
      key={`${mode}-${one(sp.topic) ?? ""}-${sessionParam ?? ""}`}
      mode={mode}
      topic={one(sp.topic)?.slice(0, 60)}
      notes={one(sp.notes)?.slice(0, 300)}
      format={format}
      planId={one(sp.plan)}
      session={sessionParam !== undefined && /^\d+$/.test(sessionParam) ? Number(sessionParam) : undefined}
    />
  );
}
