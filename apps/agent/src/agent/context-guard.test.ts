import { describe, expect, it } from "vitest";

import { estimateTokens, estimateMessagesTokens, evaluateContext } from "./context-guard";

describe("estimateTokens", () => {
  it("estimates tokens as chars / 4", () => {
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcde")).toBe(2);
    expect(estimateTokens("")).toBe(0);
  });
});

describe("estimateMessagesTokens", () => {
  it("sums tokens with per-message overhead", () => {
    const messages = [
      { role: "user" as const, content: "abcd" }, // 1 + 4 = 5
      { role: "assistant" as const, content: "abcdefgh" }, // 2 + 4 = 6
    ];
    expect(estimateMessagesTokens(messages)).toBe(11);
  });
});

describe("evaluateContext", () => {
  it("shouldCompact when over 70% of context window", () => {
    const msg = { role: "user" as const, content: "a".repeat(2800) }; // 700 tokens + 4 overhead
    const result = evaluateContext([msg], 1000);
    expect(result.shouldCompact).toBe(true);
    expect(result.shouldBlock).toBe(false);
  });

  it("shouldBlock when over 95% of context window", () => {
    const msg = { role: "user" as const, content: "a".repeat(3800) }; // 950 tokens + 4 overhead
    const result = evaluateContext([msg], 1000);
    expect(result.shouldCompact).toBe(true);
    expect(result.shouldBlock).toBe(true);
  });

  it("neither when under 70%", () => {
    const msg = { role: "user" as const, content: "a".repeat(100) };
    const result = evaluateContext([msg], 1000);
    expect(result.shouldCompact).toBe(false);
    expect(result.shouldBlock).toBe(false);
  });

  it("uses default context window when not specified", () => {
    const msg = { role: "user" as const, content: "hello" };
    const result = evaluateContext([msg]);
    expect(result.max).toBe(200_000);
  });
});
