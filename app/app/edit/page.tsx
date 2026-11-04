import { GameEditor } from "@/components/webapp/GameEditor";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Lernspiel anpassen: Fragen ansehen, ersetzen, löschen, ganzes Level neu erstellen (Kopie). */
export default async function AppEditPage({ searchParams }: PageProps<"/app/edit">) {
  const sp = await searchParams;
  return <GameEditor id={one(sp.id) ?? ""} next={one(sp.next)} />;
}
