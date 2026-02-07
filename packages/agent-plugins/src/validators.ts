import { z } from "zod";

export const pluginRiskLevelSchema = z.union([
  z.literal("low"),
  z.literal("medium"),
  z.literal("high"),
]);

export const pluginManifestSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  tools: z.array(z.string().min(1)).min(1),
  capabilities: z.array(z.string().min(1)).optional(),
  requiredEnv: z.array(z.string().min(1)).optional(),
  riskLevel: pluginRiskLevelSchema.optional(),
});
