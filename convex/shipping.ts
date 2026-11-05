import { ConvexError, v } from "convex/values";
import { query, internalQuery, mutation } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { requirePermission } from "./lib/auth";
import {
  DEFAULT_SHIPPING_SETTINGS,
  type ShippingSettings,
} from "../shared/shipping";

const MAX_CENTS = 10_000_000;

export const loadShippingSettings = async (
  ctx: QueryCtx | MutationCtx,
): Promise<ShippingSettings> => {
  const [row] = await ctx.db.query("shippingSettings").take(1);
  if (!row) return DEFAULT_SHIPPING_SETTINGS;
  return {
    flatRateCents: row.flatRateCents,
    freeShippingThresholdCents: row.freeShippingThresholdCents,
    codEnabled: row.codEnabled,
    codFeeCents: row.codFeeCents,
    codMaxOrderCents: row.codMaxOrderCents,
  };
};

export const getSettings = internalQuery({
  args: {},
  handler: async (ctx) => loadShippingSettings(ctx),
});

// Public: storefront needs the flat tariff and COD flag before checkout.
export const getPublicSettings = query({
  args: {},
  handler: async (ctx) => loadShippingSettings(ctx),
});

export const getAdminSettings = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "shipping.manage");
    const [row] = await ctx.db.query("shippingSettings").take(1);
    return { settings: await loadShippingSettings(ctx), updatedAt: row?.updatedAt ?? null };
  },
});

const centsField = (name: string, value: number | undefined, { positive = false } = {}) => {
  if (value === undefined) return;
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_CENTS || (positive && value === 0)) {
    throw new ConvexError(`${name} trebuie să fie un număr întreg ${positive ? "pozitiv" : "nenegativ"} de bani.`);
  }
};

export const updateSettings = mutation({
  args: {
    flatRateCents: v.number(),
    freeShippingThresholdCents: v.optional(v.number()),
    codEnabled: v.boolean(),
    codFeeCents: v.number(),
    codMaxOrderCents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { identity } = await requirePermission(ctx, "shipping.manage");
    centsField("Tariful", args.flatRateCents);
    centsField("Pragul", args.freeShippingThresholdCents, { positive: true });
    centsField("Taxa ramburs", args.codFeeCents);
    centsField("Valoarea maximă", args.codMaxOrderCents, { positive: true });
    const [row] = await ctx.db.query("shippingSettings").take(1);
    const patch = { ...args, updatedAt: Date.now(), updatedBy: identity.subject };
    if (row) await ctx.db.patch(row._id, patch);
    else await ctx.db.insert("shippingSettings", patch);
  },
});
