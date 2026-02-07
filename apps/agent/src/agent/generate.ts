import { createGateway } from "@ai-sdk/gateway";
import { env } from "@zenthor-assist/env/agent";
import type { Tool } from "ai";
import { generateText, stepCountIs, streamText } from "ai";

import { runWithFallback } from "./model-fallback";
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

export interface AgentConfig {
  systemPrompt?: string;
  model?: string;
  fallbackModel?: string;
  toolPolicy?: { allow?: string[]; deny?: string[] };
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface GenerateResult {
  content: string;
  toolCalls?: unknown[];
  modelUsed: string;
}

function getModel(name: string) {
  return gateway(name);
}

function buildSystemPrompt(skills?: Skill[], agentConfig?: AgentConfig): string {
  const basePrompt = agentConfig?.systemPrompt ?? BASE_SYSTEM_PROMPT;

  if (!skills || skills.length === 0) return basePrompt;

  const skillsSection = skills
    .map((s) => {
      const lines = [`### ${s.name}`, s.description];
      if (s.config?.systemPrompt) lines.push(s.config.systemPrompt);
      return lines.join("\n");
    })
    .join("\n\n");

  return `${basePrompt}\n\n## Active Skills\n\n${skillsSection}`;
}

function getDefaultTools(modelName: string): Record<string, Tool> {
  return {
    ...tools,
    ...getWebSearchTool(modelName),
  };
}

export async function generateResponse(
  conversationMessages: Message[],
  skills?: Skill[],
  options?: {
    modelOverride?: string;
    toolsOverride?: Record<string, Tool>;
    agentConfig?: AgentConfig;
  },
): Promise<GenerateResult> {
  const primaryModel = options?.agentConfig?.model ?? options?.modelOverride ?? env.AI_MODEL;
  const fallbackModel = options?.agentConfig?.fallbackModel ?? env.AI_FALLBACK_MODEL;

  const { result, modelUsed } = await runWithFallback({
    primaryModel,
    fallbackModel,
    run: async (modelName) => {
      const m = getModel(modelName);
      const result = await generateText({
        model: m,
        system: buildSystemPrompt(skills, options?.agentConfig),
        messages: conversationMessages,
        tools: options?.toolsOverride ?? getDefaultTools(modelName),
        stopWhen: stepCountIs(10),
      });

      const toolCalls = result.steps
        .flatMap((step) => step.toolCalls)
        .map((tc) => ({ name: tc.toolName, input: tc.input }));

      return {
        content: result.text,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };
    },
  });

  return { ...result, modelUsed };
}

interface StreamCallbacks {
  onChunk: (accumulatedText: string) => void;
}

export async function generateResponseStreaming(
  conversationMessages: Message[],
  skills?: Skill[],
  callbacks?: StreamCallbacks,
  options?: {
    modelOverride?: string;
    toolsOverride?: Record<string, Tool>;
    agentConfig?: AgentConfig;
  },
): Promise<GenerateResult> {
  const primaryModel = options?.agentConfig?.model ?? options?.modelOverride ?? env.AI_MODEL;
  const fallbackModel = options?.agentConfig?.fallbackModel ?? env.AI_FALLBACK_MODEL;

  const { result, modelUsed } = await runWithFallback({
    primaryModel,
    fallbackModel,
    run: async (modelName) => {
      const m = getModel(modelName);
      const streamResult = streamText({
        model: m,
        system: buildSystemPrompt(skills, options?.agentConfig),
        messages: conversationMessages,
        tools: options?.toolsOverride ?? getDefaultTools(modelName),
        stopWhen: stepCountIs(10),
      });

      let accumulated = "";
      for await (const chunk of streamResult.textStream) {
        accumulated += chunk;
        callbacks?.onChunk(accumulated);
      }

      const steps = await streamResult.steps;
      const text = await streamResult.text;
      const toolCalls = steps
        .flatMap((step) => step.toolCalls)
        .map((tc) => ({ name: tc.toolName, input: tc.input }));

      return {
        content: text,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };
    },
  });

  return { ...result, modelUsed };
}
