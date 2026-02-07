import { ConvexError } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;

/**
 * Require an authenticated Clerk identity. Throws if the caller is not
 * authenticated.
 */
export async function requireIdentity(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Unauthorized");
  }
  return identity;
}

/**
 * Require an authenticated user. Resolves the Clerk identity to a user record.
 * Throws if not authenticated or if no matching user exists.
 */
export async function requireUser(ctx: Ctx): Promise<Doc<"users">> {
  const identity = await requireIdentity(ctx);
  const user = await ctx.db
    .query("users")
    .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
    .first();
  if (!user) {
    throw new ConvexError("User not found");
  }
  return user;
}

/**
 * Require that the authenticated user owns the given conversation.
 *
 * For web conversations, checks `conversation.userId`.
 * For WhatsApp conversations, checks via the linked contact's `userId`.
 *
 * Returns the conversation document on success.
 */
export async function requireConversationOwner(
  ctx: Ctx,
  conversationId: Id<"conversations">,
): Promise<Doc<"conversations">> {
  const user = await requireUser(ctx);
  const conversation = await ctx.db.get(conversationId);
  if (!conversation) {
    throw new ConvexError("Conversation not found");
  }

  // Web conversation: direct userId match
  if (conversation.userId && conversation.userId === user._id) {
    return conversation;
  }

  // WhatsApp conversation: check if contact is linked to this user
  if (conversation.contactId) {
    const contact = await ctx.db.get(conversation.contactId);
    if (contact && contact.userId === user._id) {
      return conversation;
    }
  }

  throw new ConvexError("Access denied");
}
