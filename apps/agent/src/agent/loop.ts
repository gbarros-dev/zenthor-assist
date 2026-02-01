import { api } from "@zenthor-assist/backend/convex/_generated/api";

import { getConvexClient } from "../convex/client";
import { sendWhatsAppMessage } from "../whatsapp/sender";
import { compactMessages } from "./compact";
import { generateResponse, generateResponseStreaming } from "./generate";

export function startAgentLoop() {
  const client = getConvexClient();
  console.info("[agent] Starting agent loop — subscribing to pending jobs...");

  client.onUpdate(api.agent.getPendingJobs, {}, async (jobs) => {
    if (!jobs || jobs.length === 0) return;

    for (const job of jobs) {
      try {
        const claimed = await client.mutation(api.agent.claimJob, { jobId: job._id });
        if (!claimed) continue;

        console.info(`[agent] Processing job ${job._id} for conversation ${job.conversationId}`);

        const context = await client.query(api.agent.getConversationContext, {
          conversationId: job.conversationId,
        });
        if (!context) {
          await client.mutation(api.agent.failJob, { jobId: job._id });
          continue;
        }

        const conversationMessages = context.messages
          .filter((m) => m.role === "user" || m.role === "assistant" || m.role === "system")
          .map((m) => ({
            role: m.role as "user" | "assistant" | "system",
            content: m.content,
          }));

        const { messages: compactedMessages, summary } =
          await compactMessages(conversationMessages);

        if (summary) {
          await client.mutation(api.messages.addSummaryMessage, {
            conversationId: job.conversationId,
            content: summary,
            channel: context.conversation.channel,
          });
          console.info(`[agent] Compacted conversation ${job.conversationId}`);
        }

        const isWeb = context.conversation.channel === "web";

        if (isWeb) {
          const placeholderId = await client.mutation(api.messages.createPlaceholder, {
            conversationId: job.conversationId,
            channel: "web",
          });

          let lastPatchTime = 0;
          const THROTTLE_MS = 200;

          const response = await generateResponseStreaming(compactedMessages, context.skills, {
            onChunk: (accumulatedText) => {
              const now = Date.now();
              if (now - lastPatchTime >= THROTTLE_MS) {
                lastPatchTime = now;
                client
                  .mutation(api.messages.updateStreamingContent, {
                    messageId: placeholderId,
                    content: accumulatedText,
                  })
                  .catch(() => {});
              }
            },
          });

          await client.mutation(api.messages.finalizeMessage, {
            messageId: placeholderId,
            content: response.content,
            toolCalls: response.toolCalls,
          });
        } else {
          const response = await generateResponse(compactedMessages, context.skills);

          await client.mutation(api.messages.addAssistantMessage, {
            conversationId: job.conversationId,
            content: response.content,
            channel: context.conversation.channel,
            toolCalls: response.toolCalls,
          });

          if (context.conversation.channel === "whatsapp" && context.contact?.phone) {
            await sendWhatsAppMessage(context.contact.phone, response.content);
          }
        }

        await client.mutation(api.agent.completeJob, { jobId: job._id });
        console.info(`[agent] Completed job ${job._id}`);
      } catch (error) {
        console.error(`[agent] Failed job ${job._id}:`, error);
        await client.mutation(api.agent.failJob, { jobId: job._id }).catch(() => {});
      }
    }
  });
}
