import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { readEnvironment } from "./lib/environment";
import { enforceRateLimit } from "./lib/rateLimit";
import {
  checkoutSnapshot,
  requestIdIsValid,
} from "./lib/inventory.utils";
import { toCents } from "./lib/pos.utils";
import { analyticsContextValidator } from "./lib/analytics.utils";
import { validAnalyticsContext } from "../shared/analytics";
import { computeOrderTotals, codAllowed } from "../shared/shipping";
import { loadShippingSettings } from "./shipping";
import { saveCustomer } from "./customers";
import { applyOrderStock } from "./orders";

const addressValidator = v.object({
  street: v.string(),
  city: v.string(),
  county: v.string(),
  postalCode: v.string(),
  country: v.string(),
});

// Cash-on-delivery (ramburs): no payment is taken; stock is allocated at
// placement inside this transaction. A stock shortfall aborts everything.
export const placeCodOrder = mutation({
  args: {
    requestId: v.string(),
    items: v.array(
      v.object({ productId: v.id("products"), quantity: v.number() }),
    ),
    customer: v.object({
      email: v.string(),
      phone: v.string(),
      firstName: v.string(),
      lastName: v.string(),
      shippingAddress: addressValidator,
      billingAddress: addressValidator,
      newsletter: v.boolean(),
    }),
    analytics: v.optional(analyticsContextValidator),
  },
  handler: async (ctx, args) => {
    if (readEnvironment().name === "production") {
      throw new ConvexError(
        "Costul transportului nu este încă stabilit. Plata este indisponibilă până la configurarea tarifului.",
      );
    }
    if (!requestIdIsValid(args.requestId)) {
      throw new ConvexError("Identificator de operațiune invalid.");
    }
    const orderKey = `cod:${args.requestId}`;
    const existing = await ctx.db
      .query("orders")
      .withIndex("by_stripeSessionId", (q) =>
        q.eq("stripeSessionId", orderKey),
      )
      .unique();
    if (existing) {
      return { orderId: existing._id, confirmationToken: orderKey };
    }
    const { customer } = args;
    const country = customer.shippingAddress.country
      .trim()
      .normalize("NFC")
      .toLowerCase();
    if (country !== "romania" && country !== "românia" && country !== "ro") {
      throw new ConvexError(
        "Livrarea este disponibilă doar în România. Corectează țara adresei de livrare.",
      );
    }
    const phone = customer.phone.trim();
    if (!/^\+?[0-9\s\-()]{7,20}$/.test(phone)) {
      throw new ConvexError("Numărul de telefon nu este valid.");
    }
    if (args.items.length === 0) {
      throw new ConvexError("Coșul este gol.");
    }

    const settings = await loadShippingSettings(ctx);
    const snapshot = await checkoutSnapshot(ctx, args.items);
    const subtotalCents = snapshot.reduce(
      (sum, item) => sum + toCents(item.price) * item.quantity,
      0,
    );
    const totals = computeOrderTotals({
      settings,
      subtotalCents,
      paymentMethod: "cod",
    });
    if (!codAllowed(settings, totals.totalCents)) {
      throw new ConvexError(
        "Plata ramburs nu este disponibilă pentru această comandă.",
      );
    }
    await enforceRateLimit(
      ctx,
      `cod-order:${customer.email.toLowerCase()}`,
      5,
      60 * 60 * 1000,
    );

    const identity = await ctx.auth.getUserIdentity();
    const customerId = await saveCustomer(
      ctx,
      { ...customer, phone },
      identity?.subject,
      identity && identity.emailVerified === true
        ? (identity.email as string | undefined)
        : undefined,
    );

    const orderItems = snapshot.map(
      ({ productId, name, price, quantity }) => ({
        productId,
        name,
        price,
        quantity,
      }),
    );
    const orderId = await ctx.db.insert("orders", {
      customerId,
      items: orderItems,
      total: totals.totalCents / 100,
      paymentMethod: "cod",
      shippingCost: totals.shippingCents / 100,
      codFee: totals.codFeeCents / 100,
      status: "pending",
      inventoryStatus: "pending",
      stripeSessionId: orderKey,
      shipping: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone,
        address: customer.shippingAddress,
      },
      billing: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone,
        address: customer.billingAddress,
      },
      ...(args.analytics && validAnalyticsContext(args.analytics, "test")
        ? { analytics: args.analytics }
        : {}),
      createdAt: Date.now(),
    });
    const order = await ctx.db.get(orderId);
    if (!order) throw new ConvexError("Comanda nu a putut fi creată.");
    const result = await applyOrderStock(ctx, order, "system:cod");
    if (result.inventoryStatus !== "applied") {
      // Roll back the whole placement: COD orders never enter needs_review.
      throw new ConvexError(
        "Stoc insuficient pentru comanda ramburs. Comanda nu a fost înregistrată.",
      );
    }
    return { orderId, confirmationToken: orderKey };
  },
});
