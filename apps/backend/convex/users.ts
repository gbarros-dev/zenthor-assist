import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireIdentity, requireUser } from "./lib/auth";

const userDoc = v.object({
  _id: v.id("users"),
  _creationTime: v.number(),
  externalId: v.string(),
  name: v.string(),
  email: v.string(),
  emailVerified: v.optional(v.boolean()),
  image: v.optional(v.string()),
  phone: v.optional(v.string()),
  status: v.union(v.literal("active"), v.literal("inactive")),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const getByExternalId = query({
  args: { externalId: v.string() },
  returns: v.union(userDoc, v.null()),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    if (identity.subject !== args.externalId) {
      throw new ConvexError("Access denied");
    }
    return await ctx.db
      .query("users")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .first();
  },
});

export const getOrCreateFromClerk = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const externalId = identity.subject;

    const existing = await ctx.db
      .query("users")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first();

    if (existing) return existing._id;

    const now = Date.now();
    return await ctx.db.insert("users", {
      externalId,
      name: args.name,
      email: args.email ?? "",
      image: args.image,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getCurrentUser = query({
  args: {},
  returns: v.union(userDoc, v.null()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
      .first();
  },
});

/** Authenticated version that throws on missing identity/user. */
export const me = query({
  args: {},
  returns: userDoc,
  handler: async (ctx) => {
    return await requireUser(ctx);
  },
});

export const list = query({
  args: {},
  returns: v.array(userDoc),
  handler: async (ctx) => {
    await requireIdentity(ctx);
    return await ctx.db.query("users").collect();
  },
});
