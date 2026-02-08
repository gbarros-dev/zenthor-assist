import { api } from "@zenthor-assist/backend/convex/_generated/api";
import type { Id } from "@zenthor-assist/backend/convex/_generated/dataModel";
import { env } from "@zenthor-assist/env/agent";
import { tool } from "ai";
import { z } from "zod";

import { getConvexClient } from "../../convex/client";

const scheduleTaskInputSchema = z.object({
  name: z.string().describe("Name of the scheduled task"),
  description: z.string().optional().describe("What this task should do"),
  intervalMinutes: z.number().describe("How often to run, in minutes"),
  payload: z.string().describe("The message or instruction to execute"),
});

const scheduleTaskDescription =
  "Schedule a recurring task or reminder. The task will automatically create messages in the conversation at the specified interval.";

/** Create a schedule_task tool bound to a specific conversation. */
export function createScheduleTask(conversationId: Id<"conversations">) {
  return tool({
    description: scheduleTaskDescription,
    inputSchema: scheduleTaskInputSchema,
    execute: async ({ name, description, intervalMinutes, payload }) => {
      const client = getConvexClient();
      const taskId = await client.mutation(api.scheduledTasks.create, {
        serviceKey: env.AGENT_SECRET,
        name,
        description,
        intervalMs: intervalMinutes * 60 * 1000,
        payload,
        enabled: true,
        conversationId,
      });
      if (!taskId) return "Failed to create scheduled task — unauthorized.";
      return `Scheduled task "${name}" created. It will run every ${intervalMinutes} minutes.`;
    },
  });
}

/** Static tool instance for plugin registry (no conversationId — overridden per-job in loop.ts). */
export const scheduleTask = tool({
  description: scheduleTaskDescription,
  inputSchema: scheduleTaskInputSchema,
  execute: async ({ name, description, intervalMinutes, payload }) => {
    const client = getConvexClient();
    const taskId = await client.mutation(api.scheduledTasks.create, {
      serviceKey: env.AGENT_SECRET,
      name,
      description,
      intervalMs: intervalMinutes * 60 * 1000,
      payload,
      enabled: true,
    });
    if (!taskId) return "Failed to create scheduled task — unauthorized.";
    return `Scheduled task "${name}" created. It will run every ${intervalMinutes} minutes.`;
  },
});
