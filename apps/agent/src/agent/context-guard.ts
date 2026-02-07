export const DEFAULT_CONTEXT_WINDOW = 200_000;

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ContextEvaluation {
  tokens: number;
  max: number;
  shouldCompact: boolean;
  shouldBlock: boolean;
}

export function estimateTokens(text: string): number {
  // chars / 4 heuristic (common approximation)
  return Math.ceil(text.length / 4);
}

export function estimateMessagesTokens(messages: Message[]): number {
  // Sum of content tokens + 4 per message overhead (role, formatting)
  return messages.reduce((total, msg) => total + estimateTokens(msg.content) + 4, 0);
}

export function evaluateContext(messages: Message[], contextWindow?: number): ContextEvaluation {
  const max = contextWindow ?? DEFAULT_CONTEXT_WINDOW;
  const tokens = estimateMessagesTokens(messages);
  return {
    tokens,
    max,
    shouldCompact: tokens > max * 0.7,
    shouldBlock: tokens > max * 0.95,
  };
}
