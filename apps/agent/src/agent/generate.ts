import { createGateway } from "@ai-sdk/gateway";
import { env } from "@zenthor-assist/env/agent";
import { generateText, stepCountIs, streamText } from "ai";

import { tools } from "./tools";
import { getWebSearchTool } from "./tools/web-search";

const gateway = createGateway({
  apiKey: env.AI_GATEWAY_API_KEY,
});

const BASE_SYSTEM_PROMPT = `You are a helpful personal AI assistant for Guilherme (gbarros). You can assist with questions, tasks, and general conversation. Be concise but friendly. When you don't know something, say so. Use tools when appropriate.`;

interface Skill {
  name: string;
  description: string;
  config?: { systemPrompt?: string };
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

function buildSystemPrompt(skills?: Skill[]): string {
  if (!skills || skills.length === 0) return BASE_SYSTEM_PROMPT;

  const skillsSection = skills
    .map((s) => {
      const lines = [`### ${s.name}`, s.description];
      if (s.config?.systemPrompt) lines.push(s.config.systemPrompt);
      return lines.join("\n");
    })
    .join("\n\n");

  return `${BASE_SYSTEM_PROMPT}\n\n## Active Skills\n\n${skillsSection}`;
}

export const model = gateway(env.AI_MODEL);

export async function generateResponse(
  conversationMessages: Message[],
  skills?: Skill[],
): Promise<{ content: string; toolCalls?: unknown[] }> {
  const result = await generateText({
    model,
    system: buildSystemPrompt(skills),
    messages: conversationMessages,
    tools: {
      ...tools,
      ...getWebSearchTool(env.AI_MODEL),
    },
    stopWhen: stepCountIs(10),
  });

  const toolCalls = result.steps
    .flatMap((step) => step.toolCalls)
    .map((tc) => ({ name: tc.toolName, input: tc.input }));

  return {
    content: result.text,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
  };
}

interface StreamCallbacks {
  onChunk: (accumulatedText: string) => void;
}

export async function generateResponseStreaming(
  conversationMessages: Message[],
  skills?: Skill[],
  callbacks?: StreamCallbacks,
): Promise<{ content: string; toolCalls?: unknown[] }> {
  const result = streamText({
    model,
    system: buildSystemPrompt(skills),
    messages: conversationMessages,
    tools: {
      ...tools,
      ...getWebSearchTool(env.AI_MODEL),
    },
    stopWhen: stepCountIs(10),
  });

  let accumulated = "";
  for await (const chunk of result.textStream) {
    accumulated += chunk;
    callbacks?.onChunk(accumulated);
  }

  const steps = await result.steps;
  const text = await result.text;
  const toolCalls = steps
    .flatMap((step) => step.toolCalls)
    .map((tc) => ({ name: tc.toolName, input: tc.input }));

  return {
    content: text,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
  };
}
