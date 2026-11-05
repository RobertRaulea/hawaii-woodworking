"use node";

import { Resend } from "resend";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { readEnvironment } from "./lib/environment";
import { createOblioInvoice } from "./lib/oblio";
import { SITE_NAME } from "../shared/seo/seo.utils";
import {
  generateAdminEmailHtml,
  generateCustomerEmailHtml,
  shortOrderNumber,
} from "./lib/orderEmails.utils";
import type { InvoiceInfo } from "./lib/orderEmails.utils";
import { purchaseSnapshotValidator } from "./lib/analytics.utils";
import { PURCHASE_RETRY_DELAYS_MS, sendPurchase } from "./lib/posthog";

export const capturePurchaseAnalytics = internalAction({
  args: {
    snapshot: purchaseSnapshotValidator,
    attempt: v.optional(v.number()),
  },
  handler: async (ctx, { snapshot, attempt = 0 }): Promise<string> => {
    if (!Number.isSafeInteger(attempt) || attempt < 0 || attempt > PURCHASE_RETRY_DELAYS_MS.length) return "discarded";
    try {
      if (readEnvironment().name !== snapshot.context.environment) return "discarded";
    } catch {
      return "disabled";
    }
    const result = await sendPurchase(snapshot);
    if (result === "retry" && attempt < PURCHASE_RETRY_DELAYS_MS.length) {
      try {
        await ctx.scheduler.runAfter(
          PURCHASE_RETRY_DELAYS_MS[attempt],
          internal.postPayment.capturePurchaseAnalytics,
          { snapshot, attempt: attempt + 1 },
        );
        return "retry_scheduled";
      } catch {
        console.error("Purchase analytics retry could not be scheduled");
      }
    }
    if (result === "retry") console.error("Purchase analytics delivery exhausted");
    return result;
  },
});

export const handlePostPayment = internalAction({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, { orderId }) => {
    const isTest = readEnvironment().name === "test";
    const resendApiKey = process.env.RESEND_API_KEY;
    const adminEmail = process.env.ADMIN_EMAIL;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@hawaii-woodworking.ro";

    if (!resendApiKey || !adminEmail) {
      if (isTest) {
        console.info("TEST: post-payment emails skipped; Resend credentials or admin email missing", orderId);
        return;
      }
      console.error("Missing Resend API credentials or admin email");
      throw new Error("Missing Resend API credentials or admin email");
    }

    let oblioCredentials: { apiEmail: string; apiSecret: string; cif: string } | null = null;
    if (!isTest) {
      const apiEmail = process.env.OBLIO_API_EMAIL;
      const apiSecret = process.env.OBLIO_API_SECRET;
      const cif = process.env.OBLIO_API_CIF;
      if (!apiEmail || !apiSecret || !cif) {
        console.error("Missing Oblio API credentials");
        throw new Error("Missing Oblio API credentials");
      }
      oblioCredentials = { apiEmail, apiSecret, cif };
    }

    const order = await ctx.runMutation(internal.orders.getOrderWithCustomer, {
      orderId,
    });

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }
    if (
      order.inventoryStatus !== undefined &&
      order.inventoryStatus !== "applied"
    ) {
      throw new Error(
        "Order inventory must be applied before post-payment processing"
      );
    }

    const isCod = order.paymentMethod === "cod";
    let invoice: InvoiceInfo = { kind: "none" };

    // COD invoices are issued manually; never auto-invoice a ramburs order.
    if (!isCod) {
      if (isTest) {
        invoice = { kind: "simulated", number: `TEST-${shortOrderNumber(order._id)}` };
      } else if (order.invoiceId) {
        invoice = { kind: "link", number: order.invoiceId, url: order.invoicePdfUrl ?? "" };
      } else if (oblioCredentials) {
        try {
          const oblioInvoice = await createOblioInvoice(
            order,
            oblioCredentials.apiEmail,
            oblioCredentials.apiSecret,
            oblioCredentials.cif
          );
          const invoiceId = `${oblioInvoice.seriesName}-${oblioInvoice.number}`;
          const invoicePdfUrl = oblioInvoice.link;

          await ctx.runMutation(internal.orders.setInvoiceData, {
            orderId,
            invoiceId,
            invoicePdfUrl,
          });
          invoice = { kind: "link", number: invoiceId, url: invoicePdfUrl };
        } catch {
          invoice = { kind: "failed" };
          console.error("Oblio invoice creation failed; manual verification required before retry");
        }
      }
    }

    const resend = new Resend(resendApiKey);
    const number = shortOrderNumber(order._id);
    const subjectPrefix = isTest ? "[TEST] " : "";

    try {
      await resend.emails.send({
        from: fromEmail,
        to: adminEmail,
        subject: `${subjectPrefix}Comandă nouă #${number} - ${order.customer.firstName} ${order.customer.lastName}`,
        html: generateAdminEmailHtml(order, invoice, isCod),
      });
    } catch {
      console.error("Admin email failed");
    }

    try {
      await resend.emails.send({
        from: fromEmail,
        to: order.customer.email,
        subject: `${subjectPrefix}Comanda #${number} a fost ${isCod ? "înregistrată" : "confirmată"} - ${SITE_NAME}`,
        html: generateCustomerEmailHtml(order, invoice, isCod, isTest),
      });
    } catch {
      console.error("Customer email failed");
    }

    console.log(`Post-payment processing completed for order ${orderId}`);
  },
});
