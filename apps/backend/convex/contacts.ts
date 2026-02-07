import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const getByPhone = query({
  args: { phone: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("contacts"),
      _creationTime: v.number(),
      phone: v.string(),
      name: v.string(),
      isAllowed: v.boolean(),
      userId: v.optional(v.id("users")),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contacts")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();
  },
});

export const create = mutation({
  args: {
    phone: v.string(),
    name: v.string(),
    isAllowed: v.boolean(),
  },
  returns: v.id("contacts"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("contacts", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("contacts"),
    name: v.optional(v.string()),
    isAllowed: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("contacts"),
      _creationTime: v.number(),
      phone: v.string(),
      name: v.string(),
      isAllowed: v.boolean(),
      userId: v.optional(v.id("users")),
    }),
  ),
  handler: async (ctx) => {
    return await ctx.db.query("contacts").collect();
  },
});
