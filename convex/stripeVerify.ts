"use node";

import Stripe from "stripe";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { requirePaymentEnvironment, validateWebhookMode } from "./lib/environment";

export const verifyWebhookSignature = internalAction({
  args: {
    body: v.string(),
    signature: v.string(),
  },
  handler: async (_ctx, { body, signature }) => {
    const { secretKey } = requirePaymentEnvironment(process.env, false);
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error("Missing Stripe environment variables");
    }

    const stripe = new Stripe(secretKey);
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    validateWebhookMode(event.livemode);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        type: event.type,
        sessionId: session.id,
        paymentStatus: session.payment_status ?? "unknown",
        paymentIntentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : undefined,
      };
    }

    return {
      type: event.type,
      sessionId: "",
      paymentStatus: "unknown",
      paymentIntentId: undefined,
    };
  },
});
