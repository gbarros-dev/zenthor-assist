import { ConvexError } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;
type DbCtx = Pick<Ctx, "db">;

/**
 * Check whether the caller provided a valid agent service key.
 * If AGENT_SECRET is not configured on the backend (dev mode), always returns
 * true. When it IS set, the caller must provide a matching key.
 *
 * Returns `true` if valid, `false` if rejected. Callers should return their
 * "empty" response (null, false, []) on false — NOT throw — to avoid Sentry
 * noise from expected rejections.
 */
export function isValidServiceKey(serviceKey?: string): boolean {
  const expected = process.env.AGENT_SECRET;
  if (!expected) {
    return process.env.NODE_ENV !== "production";
  }
  return !!serviceKey && serviceKey === expected;
}

export function assertValidServiceKey(serviceKey?: string): void {
  if (!isValidServiceKey(serviceKey)) {
    throw new ConvexError("Forbidden");
  }
}

/**
 * Returns the authenticated user document, or `null` if the session is
 * missing/expired or the user record doesn't exist yet.
 *
 * Use this in web-facing queries/mutations so that expected auth failures
 * return empty results instead of generating Sentry noise.
 */
export async function getAuthUser(ctx: Ctx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
    .first();
}

/**
 * Returns the conversation if the authenticated user owns it, or `null`
 * otherwise. Handles both web (userId match) and WhatsApp (contactId → userId)
 * ownership patterns.
 */
export async function getConversationIfOwner(
  ctx: Ctx,
  conversationId: Id<"conversations">,
): Promise<Doc<"conversations"> | null> {
  const user = await getAuthUser(ctx);
  if (!user) return null;
  const conversation = await ctx.db.get(conversationId);
  if (!conversation) return null;
  if (conversation.userId && conversation.userId === user._id) return conversation;
  if (conversation.contactId) {
    const contact = await ctx.db.get(conversation.contactId);
    if (contact && contact.userId === user._id) return conversation;
  }
  return null;
}

/**
 * Returns the conversation if the provided user owns it.
 * Ownership is satisfied by either direct web ownership (`userId`) or linked
 * WhatsApp ownership (`contact.userId`).
 */
export async function getConversationIfOwnedByUser(
  ctx: DbCtx,
  userId: Id<"users">,
  conversationId: Id<"conversations">,
): Promise<Doc<"conversations"> | null> {
  const conversation = await ctx.db.get(conversationId);
  if (!conversation) return null;
  if (conversation.userId && conversation.userId === userId) return conversation;
  if (conversation.contactId) {
    const contact = await ctx.db.get(conversation.contactId);
    if (contact && contact.userId === userId) return conversation;
  }
  return null;
}
