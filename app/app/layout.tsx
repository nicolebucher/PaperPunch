import type { Metadata } from "next";
import { AppShell } from "@/components/webapp/AppShell";

export const metadata: Metadata = {
  title: "PaperPunch – Üben im Browser",
  description: "Lernmaterial hochladen oder Thema eintippen – Arbeitsblatt, Test oder Lernspiel in 1–2 Minuten. Mit Lernplan.",
};

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return <AppShell>{children}</AppShell>;
}
