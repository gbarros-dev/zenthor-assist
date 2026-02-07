import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

const toolApprovalDoc = v.object({
  _id: v.id("toolApprovals"),
  _creationTime: v.number(),
  conversationId: v.id("conversations"),
  jobId: v.id("agentQueue"),
  toolName: v.string(),
  toolInput: v.any(),
  status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
  channel: v.union(v.literal("web"), v.literal("whatsapp")),
  createdAt: v.number(),
  resolvedAt: v.optional(v.number()),
});

export const create = mutation({
  args: {
    conversationId: v.id("conversations"),
    jobId: v.id("agentQueue"),
    toolName: v.string(),
    toolInput: v.any(),
    channel: v.union(v.literal("web"), v.literal("whatsapp")),
  },
  returns: v.id("toolApprovals"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("toolApprovals", {
      conversationId: args.conversationId,
      jobId: args.jobId,
      toolName: args.toolName,
      toolInput: args.toolInput,
      status: "pending",
      channel: args.channel,
      createdAt: Date.now(),
    });
  },
});

export const resolve = mutation({
  args: {
    approvalId: v.id("toolApprovals"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
  },
  returns: v.union(toolApprovalDoc, v.null()),
  handler: async (ctx, args) => {
    const approval = await ctx.db.get(args.approvalId);
    if (!approval || approval.status !== "pending") return null;

    await ctx.db.patch(args.approvalId, {
      status: args.status,
      resolvedAt: Date.now(),
    });

    return approval;
  },
});

export const getPendingByConversation = query({
  args: { conversationId: v.id("conversations") },
  returns: v.array(toolApprovalDoc),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("toolApprovals")
      .withIndex("by_conversationId_status", (q) =>
        q.eq("conversationId", args.conversationId).eq("status", "pending"),
      )
      .collect();
  },
});

export const getPendingByJob = query({
  args: { jobId: v.id("agentQueue") },
  returns: v.array(toolApprovalDoc),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("toolApprovals")
      .withIndex("by_jobId", (q) => q.eq("jobId", args.jobId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
  },
});

export const getByJob = query({
  args: { jobId: v.id("agentQueue") },
  returns: v.array(toolApprovalDoc),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("toolApprovals")
      .withIndex("by_jobId", (q) => q.eq("jobId", args.jobId))
      .collect();
  },
});
