import { generateText } from "ai";

import { model } from "./generate";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

const COMPACTION_THRESHOLD = 50;
const RECENT_MESSAGES_COUNT = 20;

export async function compactMessages(
  messages: Message[],
): Promise<{ messages: Message[]; summary?: string }> {
  if (messages.length <= COMPACTION_THRESHOLD) {
    return { messages };
  }

  const splitIndex = messages.length - RECENT_MESSAGES_COUNT;
  const oldMessages = messages.slice(0, splitIndex);
  const recentMessages = messages.slice(splitIndex);

  const oldContent = oldMessages.map((m) => `${m.role}: ${m.content}`).join("\n\n");

  const result = await generateText({
    model,
    system:
      "You are a conversation summarizer. Summarize the following conversation into a concise paragraph that preserves key facts, decisions, and context. Start with '[Conversation Summary]'.",
    messages: [{ role: "user", content: oldContent }],
  });

  const summaryMessage: Message = {
    role: "system",
    content: result.text,
  };

  return {
    messages: [summaryMessage, ...recentMessages],
    summary: result.text,
  };
}
