import type { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";

type AuthCtx = QueryCtx | MutationCtx | ActionCtx;

/**
 * Verify the caller is authenticated and has the "admin" role.
 * Throws if unauthenticated or not an admin.
 *
 * The role is read from the Clerk JWT custom claim `role`
 * (set via Clerk Dashboard → JWT Templates → convex → Claims).
 */
export const requireAdmin = async (ctx: AuthCtx) => {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("Unauthorized: not authenticated");
  }

  const role = (identity as Record<string, unknown>).role as string | undefined;

  if (role !== "admin") {
    throw new Error("Forbidden: admin access required");
  }

  return identity;
};
