export type PluginRiskLevel = "low" | "medium" | "high";

export interface PluginContext {
  workspaceScope: string;
  channel: "web" | "whatsapp";
  conversationId: string;
  userId?: string;
  contactId?: string;
  agentId?: string;
}

export interface PluginManifest {
  name: string;
  version: string;
  tools: string[];
  capabilities?: string[];
  requiredEnv?: string[];
  riskLevel?: PluginRiskLevel;
}
