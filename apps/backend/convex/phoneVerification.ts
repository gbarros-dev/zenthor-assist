import { v } from "convex/values";

import { internalMutation, mutation, query } from "./_generated/server";

const VERIFICATION_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CLEANUP_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

function generateCode(): string {
  return Math.floor(100_000 + Math.random() * 900_000).toString();
}

export const requestVerification = mutation({
  args: {
    userId: v.id("users"),
    phone: v.string(),
  },
  returns: v.object({ success: v.boolean(), error: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    // Validate phone format: digits only, 10-15 chars
    if (!/^\d{10,15}$/.test(args.phone)) {
      return { success: false, error: "Invalid phone number format" };
    }

    // Check no other user already has this phone
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();

    if (existingUser && existingUser._id !== args.userId) {
      return { success: false, error: "Phone number already linked to another account" };
    }

    // Expire any existing pending verifications for this user
    const pending = await ctx.db
      .query("phoneVerifications")
      .withIndex("by_userId_status", (q) => q.eq("userId", args.userId).eq("status", "pending"))
      .collect();

    for (const verification of pending) {
      await ctx.db.patch(verification._id, { status: "expired" });
    }

    // Generate code and create verification row
    const code = generateCode();
    const now = Date.now();

    await ctx.db.insert("phoneVerifications", {
      userId: args.userId,
      phone: args.phone,
      code,
      status: "pending",
      createdAt: now,
    });

    // Look up or create contact
    let contact = await ctx.db
      .query("contacts")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();

    if (!contact) {
      const contactId = await ctx.db.insert("contacts", {
        phone: args.phone,
        name: args.phone,
        isAllowed: true,
      });
      contact = await ctx.db.get(contactId);
    }

    if (!contact) {
      return { success: false, error: "Failed to create contact" };
    }

    // Get or create WhatsApp conversation for this contact
    let conversation = await ctx.db
      .query("conversations")
      .withIndex("by_contactId", (q) => q.eq("contactId", contact._id))
      .filter((q) => q.eq(q.field("channel"), "whatsapp"))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!conversation) {
      const conversationId = await ctx.db.insert("conversations", {
        contactId: contact._id,
        channel: "whatsapp",
        status: "active",
      });
      conversation = await ctx.db.get(conversationId);
    }

    if (!conversation) {
      return { success: false, error: "Failed to create conversation" };
    }

    // Insert verification code as system message
    const codeMessage = `Your verification code is: ${code}\n\nThis code expires in 5 minutes.`;

    const messageId = await ctx.db.insert("messages", {
      conversationId: conversation._id,
      role: "system",
      content: codeMessage,
      channel: "whatsapp",
      status: "pending",
    });

    // Enqueue outbound delivery
    await ctx.db.insert("outboundMessages", {
      channel: "whatsapp",
      conversationId: conversation._id,
      messageId,
      to: args.phone,
      payload: { content: codeMessage },
      status: "pending",
      attemptCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true };
  },
});

export const confirmVerification = mutation({
  args: {
    userId: v.id("users"),
    code: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    phone: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("phoneVerifications")
      .withIndex("by_userId_status", (q) => q.eq("userId", args.userId).eq("status", "pending"))
      .first();

    if (!pending) {
      return { success: false, error: "No pending verification found" };
    }

    // Check TTL
    const now = Date.now();
    if (now - pending.createdAt > VERIFICATION_TTL_MS) {
      await ctx.db.patch(pending._id, { status: "expired" });
      return { success: false, error: "Verification code expired" };
    }

    // Check code
    if (pending.code !== args.code) {
      return { success: false, error: "Invalid verification code" };
    }

    // Mark verified
    await ctx.db.patch(pending._id, { status: "verified", verifiedAt: now });

    // Set phone on user
    await ctx.db.patch(args.userId, { phone: pending.phone, updatedAt: now });

    // Link contact to user
    const contact = await ctx.db
      .query("contacts")
      .withIndex("by_phone", (q) => q.eq("phone", pending.phone))
      .first();

    if (contact) {
      await ctx.db.patch(contact._id, { userId: args.userId });
    }

    return { success: true, phone: pending.phone };
  },
});

export const getVerificationStatus = query({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      phone: v.string(),
      createdAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("phoneVerifications")
      .withIndex("by_userId_status", (q) => q.eq("userId", args.userId).eq("status", "pending"))
      .first();

    if (!pending) return null;

    // Check if expired
    if (Date.now() - pending.createdAt > VERIFICATION_TTL_MS) {
      return null;
    }

    return { phone: pending.phone, createdAt: pending.createdAt };
  },
});

export const unlinkPhone = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user?.phone) return null;

    // Clear user phone
    await ctx.db.patch(args.userId, { phone: undefined, updatedAt: Date.now() });

    // Clear contact userId link
    const contact = await ctx.db
      .query("contacts")
      .withIndex("by_phone", (q) => q.eq("phone", user.phone!))
      .first();

    if (contact) {
      await ctx.db.patch(contact._id, { userId: undefined });
    }

    return null;
  },
});

export const cleanupExpired = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const cutoff = Date.now() - CLEANUP_AGE_MS;
    const all = await ctx.db.query("phoneVerifications").collect();
    let count = 0;

    for (const row of all) {
      if (row.createdAt < cutoff) {
        await ctx.db.delete(row._id);
        count++;
      }
    }

    return count;
  },
});
