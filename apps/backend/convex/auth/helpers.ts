import { ConvexError } from "convex/values";

import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;

export type UserRole = "admin" | "member";

export type AuthContext = {
  identitySubject: string;
  user: Doc<"users">;
  role: UserRole;
  isAdmin: boolean;
};

export type AdminAuthContext = AuthContext & {
  role: "admin";
  isAdmin: true;
};

function parseAdminAllowlist(): Set<string> {
  const raw = process.env["ADMIN_EMAIL_ALLOWLIST"];
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0),
  );
}

function isEmailAllowlisted(email: string | undefined): boolean {
  if (!email) return false;
  return parseAdminAllowlist().has(email.toLowerCase());
}

export function resolveRoleForEmail(email: string | undefined): UserRole {
  return isEmailAllowlisted(email) ? "admin" : "member";
}

export function resolveRoleForUser(user: Doc<"users">): UserRole {
  if (user.role === "admin" || user.role === "member") return user.role;
  return resolveRoleForEmail(user.email);
}

export async function getAuthContext(ctx: Ctx): Promise<AuthContext> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
    .first();

  if (!user) {
    throw new ConvexError("User not found");
  }

  const role = resolveRoleForUser(user);
  return {
    identitySubject: identity.subject,
    user,
    role,
    isAdmin: role === "admin",
  };
}

export function assertAdmin(auth: AuthContext): asserts auth is AdminAuthContext {
  if (!auth.isAdmin) {
    throw new ConvexError("Forbidden");
  }
}
