import type { PluginManifest } from "./types";

export function createManifest(input: PluginManifest): PluginManifest {
  return {
    ...input,
    tools: [...new Set(input.tools)],
    capabilities: input.capabilities ? [...new Set(input.capabilities)] : undefined,
    requiredEnv: input.requiredEnv ? [...new Set(input.requiredEnv)] : undefined,
  };
}
