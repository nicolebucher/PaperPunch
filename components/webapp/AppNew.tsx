"use client";

import type { WebFormat } from "@/lib/webapp/store";
import { CreateFlow } from "./CreateFlow";

/** Neues Material in der Web-App (Hochladen oder Thema), Ablauf wie in der App. */
export function AppNew(props: { mode: "upload" | "topic"; topic?: string; notes?: string; format?: WebFormat; planId?: string; session?: number }) {
  return <CreateFlow {...props} />;
}
