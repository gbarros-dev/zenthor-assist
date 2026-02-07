import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";

const conversationDoc = v.object({
  _id: v.id("conversations"),
  _creationTime: v.number(),
  channel: v.union(v.literal("whatsapp"), v.literal("web")),
  userId: v.optional(v.id("users")),
  contactId: v.optional(v.id("contacts")),
  agentId: v.optional(v.id("agents")),
  title: v.optional(v.string()),
  status: v.union(v.literal("active"), v.literal("archived")),
});

export const getOrCreate = mutation({
  args: {
    userId: v.optional(v.id("users")),
    contactId: v.optional(v.id("contacts")),
    channel: v.union(v.literal("whatsapp"), v.literal("web")),
    agentId: v.optional(v.id("agents")),
  },
  returns: v.id("conversations"),
  handler: async (ctx, args) => {
    if (args.channel === "web" && args.userId) {
      const existing = await ctx.db
        .query("conversations")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .filter((q) => q.eq(q.field("channel"), "web"))
        .filter((q) => q.eq(q.field("status"), "active"))
        .first();

      if (existing) return existing._id;

      return await ctx.db.insert("conversations", {
        userId: args.userId,
        channel: "web",
        status: "active",
        ...(args.agentId && { agentId: args.agentId }),
      });
    }

    if (args.channel === "whatsapp" && args.contactId) {
      const existing = await ctx.db
        .query("conversations")
        .withIndex("by_contactId", (q) => q.eq("contactId", args.contactId))
        .filter((q) => q.eq(q.field("channel"), "whatsapp"))
        .filter((q) => q.eq(q.field("status"), "active"))
        .first();

      if (existing) return existing._id;

      return await ctx.db.insert("conversations", {
        contactId: args.contactId,
        channel: "whatsapp",
        status: "active",
        ...(args.agentId && { agentId: args.agentId }),
      });
    }

    throw new ConvexError("Must provide userId for web or contactId for whatsapp");
  },
});

export const listByUser = query({
  args: { userId: v.id("users") },
  returns: v.array(conversationDoc),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conversations")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const listByContact = query({
  args: { contactId: v.id("contacts") },
  returns: v.array(conversationDoc),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conversations")
      .withIndex("by_contactId", (q) => q.eq("contactId", args.contactId))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("conversations") },
  returns: v.union(conversationDoc, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    title: v.optional(v.string()),
  },
  returns: v.id("conversations"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("conversations", {
      userId: args.userId,
      channel: "web",
      status: "active",
      title: args.title ?? "New chat",
    });
  },
});

export const archive = mutation({
  args: { id: v.id("conversations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.id);
    if (!conv) throw new ConvexError("Conversation not found");
    if (conv.channel === "whatsapp") throw new ConvexError("Cannot archive WhatsApp conversations");
    await ctx.db.patch(args.id, { status: "archived" });
  },
});

export const updateTitle = mutation({
  args: {
    id: v.id("conversations"),
    title: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { title: args.title });
  },
});

export const listRecentWithLastMessage = query({
  args: { userId: v.id("users") },
  returns: v.array(
    v.object({
      _id: v.id("conversations"),
      _creationTime: v.number(),
      channel: v.union(v.literal("whatsapp"), v.literal("web")),
      userId: v.optional(v.id("users")),
      contactId: v.optional(v.id("contacts")),
      agentId: v.optional(v.id("agents")),
      title: v.optional(v.string()),
      status: v.union(v.literal("active"), v.literal("archived")),
      lastMessage: v.union(
        v.object({
          content: v.string(),
          role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
          createdAt: v.number(),
        }),
        v.null(),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    // 1. Web conversations by userId
    const webConversations = await ctx.db
      .query("conversations")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // 2. WhatsApp conversations via linked contacts
    const linkedContacts = await ctx.db
      .query("contacts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const whatsappConversations = (
      await Promise.all(
        linkedContacts.map((contact) =>
          ctx.db
            .query("conversations")
            .withIndex("by_contactId", (q) => q.eq("contactId", contact._id))
            .filter((q) => q.eq(q.field("channel"), "whatsapp"))
            .filter((q) => q.eq(q.field("status"), "active"))
            .collect(),
        ),
      )
    ).flat();

    // 3. Deduplicate by _id
    const seen = new Set<string>();
    const allConversations = [...webConversations, ...whatsappConversations].filter((conv) => {
      if (seen.has(conv._id)) return false;
      seen.add(conv._id);
      return true;
    });

    // 4. Attach last message and sort by recency
    const results = await Promise.all(
      allConversations.map(async (conv) => {
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_conversationId", (q) => q.eq("conversationId", conv._id))
          .order("desc")
          .first();

        return {
          ...conv,
          lastMessage: messages
            ? { content: messages.content, role: messages.role, createdAt: messages._creationTime }
            : null,
        };
      }),
    );

    return results.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ?? a._creationTime;
      const bTime = b.lastMessage?.createdAt ?? b._creationTime;
      return bTime - aTime;
    });
  },
});
