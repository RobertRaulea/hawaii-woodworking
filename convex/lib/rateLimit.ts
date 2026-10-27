import { ConvexError, v } from "convex/values";
import type { MutationCtx } from "../_generated/server";
import { internalMutation } from "../_generated/server";

/**
 * Fixed-window rate limiter backed by the rateLimits table.
 * Throws ConvexError when `limit` calls were already recorded inside
 * the current `windowMs` window for `key`.
 */
export const enforceRateLimit = async (
  ctx: MutationCtx,
  key: string,
  limit: number,
  windowMs: number,
): Promise<void> => {
  const now = Date.now();
  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();

  if (!existing || now - existing.windowStart > windowMs) {
    if (existing) {
      await ctx.db.patch(existing._id, { windowStart: now, count: 1 });
    } else {
      await ctx.db.insert("rateLimits", { key, windowStart: now, count: 1 });
    }
    return;
  }

  if (existing.count >= limit) {
    throw new ConvexError(
      "Prea multe încercări. Te rugăm să reiei peste câteva minute.",
    );
  }
  await ctx.db.patch(existing._id, { count: existing.count + 1 });
};

/**
 * Callable from actions (e.g. createCheckoutSession) which cannot run
 * db mutations directly.
 */
export const checkRateLimit = internalMutation({
  args: {
    key: v.string(),
    limit: v.number(),
    windowMs: v.number(),
  },
  handler: async (ctx, { key, limit, windowMs }) =>
    enforceRateLimit(ctx, key, limit, windowMs),
});
