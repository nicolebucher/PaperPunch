import { AppPlans } from "@/components/webapp/AppPlans";

export default async function AppPlansPage({ searchParams }: PageProps<"/app/plans">) {
  const sp = await searchParams;
  const id = Array.isArray(sp.id) ? sp.id[0] : sp.id;
  return <AppPlans id={id} create={sp.new !== undefined} />;
}
