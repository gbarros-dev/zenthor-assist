import {
  customCtx,
  customCtxAndArgs,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import { v } from "convex/values";

import { type MutationCtx, mutation, type QueryCtx, query } from "../_generated/server";
import { assertValidServiceKey } from "../lib/auth";
import { assertAdmin, type AuthContext, getAuthContext } from "./helpers";

export type AuthenticatedQueryCtx = QueryCtx & {
  auth: AuthContext;
};

export type AuthenticatedMutationCtx = MutationCtx & {
  auth: AuthContext;
};

export const authQuery = customQuery(
  query,
  customCtx(async (ctx) => {
    const auth = await getAuthContext(ctx);
    return { auth };
  }),
);

export const authMutation = customMutation(
  mutation,
  customCtx(async (ctx) => {
    const auth = await getAuthContext(ctx);
    return { auth };
  }),
);

export const adminQuery = customQuery(
  query,
  customCtx(async (ctx) => {
    const auth = await getAuthContext(ctx);
    assertAdmin(auth);
    return { auth };
  }),
);

export const adminMutation = customMutation(
  mutation,
  customCtx(async (ctx) => {
    const auth = await getAuthContext(ctx);
    assertAdmin(auth);
    return { auth };
  }),
);

const serviceQueryAuth = customCtxAndArgs({
  args: { serviceKey: v.optional(v.string()) },
  input: async (_ctx, args) => {
    assertValidServiceKey(args.serviceKey);
    return {
      ctx: {},
      args: {},
    };
  },
});

const serviceMutationAuth = customCtxAndArgs({
  args: { serviceKey: v.optional(v.string()) },
  input: async (_ctx, args) => {
    assertValidServiceKey(args.serviceKey);
    return {
      ctx: {},
      args: {},
    };
  },
});

export const serviceQuery = customQuery(query, serviceQueryAuth);
export const serviceMutation = customMutation(mutation, serviceMutationAuth);
