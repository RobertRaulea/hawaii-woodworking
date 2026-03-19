import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

export const handleStripeWebhook = httpAction(async (ctx, request) => {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const body = await request.text();

  // Verify signature and parse event in Node.js action
  let event: {
    type: string;
    sessionId: string;
    paymentStatus: string;
    paymentIntentId?: string;
  };

  try {
    event = await ctx.runAction(internal.stripeVerify.verifyWebhookSignature, {
      body,
      signature,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe webhook verification failed:", message);
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" &&
    event.paymentStatus === "paid"
  ) {
    let orderId;
    try {
      orderId = await ctx.runMutation(internal.orders.markOrderPaid, {
        stripeSessionId: event.sessionId,
        stripePaymentIntentId: event.paymentIntentId,
      });
    } catch (err) {
      console.error("Failed to mark order as paid:", err);
      return new Response("Failed to process payment confirmation", {
        status: 500,
      });
    }

    try {
      await ctx.runAction(internal.postPayment.handlePostPayment, {
        orderId,
      });
    } catch (err) {
      console.error("Post-payment processing failed:", err);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
