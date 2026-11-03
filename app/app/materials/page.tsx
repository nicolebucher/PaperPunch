import { AppMaterials } from "@/components/webapp/AppMaterials";

export default async function AppMaterialsPage({ searchParams }: PageProps<"/app/materials">) {
  const sp = await searchParams;
  const id = Array.isArray(sp.id) ? sp.id[0] : sp.id;
  return <AppMaterials id={id} />;
}
