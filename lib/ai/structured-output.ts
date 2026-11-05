import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { getClaudeClient } from "./claude-client";
import { currentModel, recordUsage } from "./model-context";
import { recordAiUsage } from "@/lib/usage-stats";

type MessageContent = Anthropic.Messages.MessageParam["content"];

interface StructuredOutputParams<T extends z.ZodTypeAny> {
  system: string;
  userContent: MessageContent;
  schema: T;
  toolName: string;
  toolDescription: string;
  maxTokens?: number;
}

function schemaToToolInputSchema(schema: z.ZodTypeAny): Anthropic.Messages.Tool.InputSchema {
  const raw = z.toJSONSchema(schema, { target: "draft-7" }) as Record<string, unknown>;
  delete raw.$schema;
  return raw as Anthropic.Messages.Tool.InputSchema;
}

/**
 * Erzwingt über tool_choice ein einziges strukturiertes JSON-Ergebnis und validiert es
 * gegen das Zod-Schema. Bei ungültiger oder abgeschnittener Antwort wird mit Fehlerhinweis
 * neu versucht, damit eine leicht abweichende oder trunkierte Modellantwort nicht die ganze
 * Generierung crasht.
 */
export async function generateStructuredOutput<T extends z.ZodTypeAny>({
  system,
  userContent,
  schema,
  toolName,
  toolDescription,
  maxTokens = 4096,
}: StructuredOutputParams<T>): Promise<z.infer<T>> {
  const client = getClaudeClient();
  const tool: Anthropic.Messages.Tool = {
    name: toolName,
    description: toolDescription,
    input_schema: schemaToToolInputSchema(schema),
  };

  let lastError: string | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    // .stream() + finalMessage() statt .create(): Bei hohem max_tokens (z.B. für das
    // Lernspiel mit bis zu 5 Leveln x 15 Fragen) verlangt die Anthropic-SDK Streaming,
    // da eine Non-Streaming-Anfrage sonst als potenziell zu lang abgelehnt wird.
    const stream = client.messages.stream({
      model: currentModel(),
      max_tokens: maxTokens,
      system: lastError
        ? `${system}\n\nDein letzter Versuch war ungültig (${lastError}). Bitte antworte exakt nach dem vorgegebenen Schema und halte dich an die unteren Grenzen der erlaubten Mengen (z.B. Anzahl Level/Fragen/Aufgaben), damit die Antwort sicher vollständig bleibt.`
        : system,
      tools: [tool],
      tool_choice: { type: "tool", name: toolName },
      messages: [{ role: "user", content: userContent }],
    });
    const message = await stream.finalMessage();
    recordUsage(message.usage.input_tokens, message.usage.output_tokens);
    // Echte Kosten fürs Kosten-Dashboard mitschreiben (Upstash, nur Summen)
    await recordAiUsage(message.model || currentModel(), toolName, message.usage.input_tokens, message.usage.output_tokens);

    if (message.stop_reason === "max_tokens") {
      lastError = "Antwort wurde wegen Längenbegrenzung abgeschnitten";
      continue;
    }

    const toolUse = message.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      lastError = "Keine strukturierte Antwort erhalten";
      continue;
    }

    const result = schema.safeParse(toolUse.input);
    if (result.success) {
      return result.data;
    }
    lastError = result.error.issues.map((issue) => issue.message).join(", ");
  }

  throw new Error(`KI-Antwort entspricht nicht dem erwarteten Format: ${lastError}`);
}
