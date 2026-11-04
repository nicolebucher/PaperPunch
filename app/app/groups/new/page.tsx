import { GroupCreate } from "@/components/webapp/GroupCreate";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Lerngruppe starten (auch "Neue Runde" aus einer beendeten Gruppe, dann mit anderem Lernspiel). */
export default async function AppGroupNewPage({ searchParams }: PageProps<"/app/groups/new">) {
  const sp = await searchParams;
  return (
    <div className="mx-auto w-full max-w-xl pt-4 lg:pt-0">
      <GroupCreate initialName={one(sp.name)?.slice(0, 40) ?? ""} exclude={one(sp.not)?.slice(0, 120)} preselect={one(sp.game)} />
    </div>
  );
}
