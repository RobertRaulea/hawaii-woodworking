"use node";

import { Resend } from "resend";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { readEnvironment } from "./lib/environment";
import { createOblioInvoice } from "./lib/oblio";
import type { OrderWithCustomer } from "./lib/oblio";
import { escapeHtml } from "../shared/seo/seo.utils";
import { purchaseSnapshotValidator } from "./lib/analytics.utils";
import { PURCHASE_RETRY_DELAYS_MS, sendPurchase } from "./lib/posthog";

type OrderItem = OrderWithCustomer["items"][number];

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
    if (readEnvironment().name === "test") {
      console.info("TEST: fiscal invoices and transactional emails disabled", orderId);
      return;
    }
    const oblioApiEmail = process.env.OBLIO_API_EMAIL;
    const oblioApiSecret = process.env.OBLIO_API_SECRET;
    const oblioApiCif = process.env.OBLIO_API_CIF;
    const resendApiKey = process.env.RESEND_API_KEY;
    const adminEmail = process.env.ADMIN_EMAIL;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@hawaii-woodworking.ro";

    if (!oblioApiEmail || !oblioApiSecret || !oblioApiCif) {
      console.error("Missing Oblio API credentials");
      throw new Error("Missing Oblio API credentials");
    }

    if (!resendApiKey || !adminEmail) {
      console.error("Missing Resend API credentials or admin email");
      throw new Error("Missing Resend API credentials or admin email");
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

    let invoiceId = order.invoiceId ?? "";
    let invoicePdfUrl = order.invoicePdfUrl ?? "";
    let invoiceFailed = false;

    if (!order.invoiceId) {
      try {
        const oblioInvoice = await createOblioInvoice(
          order,
          oblioApiEmail,
          oblioApiSecret,
          oblioApiCif
        );
        invoiceId = `${oblioInvoice.seriesName}-${oblioInvoice.number}`;
        invoicePdfUrl = oblioInvoice.link;

        await ctx.runMutation(internal.orders.setInvoiceData, {
          orderId,
          invoiceId,
          invoicePdfUrl,
        });
      } catch {
        invoiceFailed = true;
        console.error("Oblio invoice creation failed; manual verification required before retry");
      }
    }

    const resend = new Resend(resendApiKey);

    try {
      await resend.emails.send({
        from: fromEmail,
        to: adminEmail,
        subject: `🔔 Comandă nouă #${orderId.slice(-6)} - ${order.customer.firstName} ${order.customer.lastName}`,
        html: generateAdminEmailHtml(order, invoicePdfUrl, invoiceFailed),
      });
    } catch {
      console.error("Admin email failed");
    }

    try {
      await resend.emails.send({
        from: fromEmail,
        to: order.customer.email,
        subject: "Mulțumim pentru comandă! 🌺",
        html: generateCustomerEmailHtml(order, invoicePdfUrl),
      });
    } catch {
      console.error("Customer email failed");
    }

    console.log(`Post-payment processing completed for order ${orderId}`);
  },
});

function generateAdminEmailHtml(order: OrderWithCustomer, invoicePdfUrl: string, invoiceFailed: boolean): string {
  const shipping = order.shipping ?? {
    firstName: order.customer.firstName,
    lastName: order.customer.lastName,
    phone: order.customer.phone,
    address: order.customer.shippingAddress,
  };
  const itemsHtml = order.items
    .map(
      (item: OrderItem) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.name)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.price.toFixed(2)} RON</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${(item.price * item.quantity).toFixed(2)} RON</td>
    </tr>
  `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #f9fafb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
        <h1 style="margin: 0 0 16px 0; color: #111827; font-size: 24px;">🔔 Comandă nouă!</h1>
        <p style="margin: 0; color: #6b7280;">Comandă #${escapeHtml(order._id.slice(-8))}</p>
      </div>

      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #111827;">Detalii client</h2>
        <p style="margin: 4px 0;"><strong>Nume:</strong> ${escapeHtml(shipping.firstName)} ${escapeHtml(shipping.lastName)}</p>
        <p style="margin: 4px 0;"><strong>Email:</strong> ${escapeHtml(order.customer.email)}</p>
        <p style="margin: 4px 0;"><strong>Telefon:</strong> ${escapeHtml(shipping.phone ?? order.customer.phone ?? "")}</p>
        <p style="margin: 4px 0;"><strong>Adresă livrare:</strong><br>
          ${escapeHtml(shipping.address.street)}<br>
          ${escapeHtml(shipping.address.city)}, ${escapeHtml(shipping.address.county)}<br>
          ${escapeHtml(shipping.address.postalCode)}, ${escapeHtml(shipping.address.country)}
        </p>
      </div>

      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #111827;">Produse comandate</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f9fafb;">
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Produs</th>
              <th style="padding: 8px; text-align: center; border-bottom: 2px solid #e5e7eb;">Cantitate</th>
              <th style="padding: 8px; text-align: right; border-bottom: 2px solid #e5e7eb;">Preț</th>
              <th style="padding: 8px; text-align: right; border-bottom: 2px solid #e5e7eb;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding: 12px 8px; text-align: right; font-weight: bold;">Total comandă:</td>
              <td style="padding: 12px 8px; text-align: right; font-weight: bold; font-size: 18px;">${order.total.toFixed(2)} RON</td>
            </tr>
          </tfoot>
        </table>
      </div>

      ${invoiceFailed ? '<p>Factura nu a putut fi confirmată. Verifică manual în Oblio înainte de orice reîncercare pentru a evita duplicarea.</p>' : ""}
      ${
        invoicePdfUrl
          ? `
      <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px 0; font-weight: 600; color: #065f46;">✅ Factură Oblio generată</p>
        <a href="${escapeHtml(invoicePdfUrl)}" style="color: #059669; text-decoration: underline;">Descarcă factura PDF</a>
      </div>
      `
          : ""
      }

      <div style="background: #f9fafb; border-radius: 8px; padding: 16px; text-align: center;">
        <p style="margin: 0; color: #6b7280; font-size: 14px;">Hawaii Woodworking - Sistem automat de notificări</p>
      </div>
    </body>
    </html>
  `;
}

function generateCustomerEmailHtml(order: OrderWithCustomer, invoicePdfUrl: string): string {
  const shipping = order.shipping ?? {
    firstName: order.customer.firstName,
    lastName: order.customer.lastName,
    phone: order.customer.phone,
    address: order.customer.shippingAddress,
  };
  const itemsHtml = order.items
    .map(
      (item: OrderItem) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.name)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${(item.price * item.quantity).toFixed(2)} RON</td>
    </tr>
  `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; padding: 32px; margin-bottom: 24px; text-align: center;">
        <h1 style="margin: 0 0 8px 0; color: white; font-size: 28px;">🌺 Mulțumim pentru comandă!</h1>
        <p style="margin: 0; color: rgba(255,255,255,0.9);">Comanda ta a fost confirmată și plătită cu succes</p>
      </div>

      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #111827;">Bună, ${escapeHtml(shipping.firstName)}!</h2>
        <p style="margin: 0 0 12px 0; color: #4b5563;">
          Comanda ta #${escapeHtml(order._id.slice(-8))} a fost procesată cu succes. Vei primi produsele la adresa:
        </p>
        <div style="background: #f9fafb; border-radius: 6px; padding: 12px; margin-bottom: 12px;">
          <p style="margin: 0; font-weight: 500;">${escapeHtml(shipping.address.street)}</p>
          <p style="margin: 4px 0 0 0;">${escapeHtml(shipping.address.city)}, ${escapeHtml(shipping.address.county)}</p>
          <p style="margin: 4px 0 0 0;">${escapeHtml(shipping.address.postalCode)}, ${escapeHtml(shipping.address.country)}</p>
        </div>
      </div>

      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #111827;">Sumar comandă</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f9fafb;">
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Produs</th>
              <th style="padding: 8px; text-align: center; border-bottom: 2px solid #e5e7eb;">Cantitate</th>
              <th style="padding: 8px; text-align: right; border-bottom: 2px solid #e5e7eb;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 12px 8px; text-align: right; font-weight: bold;">Total plătit:</td>
              <td style="padding: 12px 8px; text-align: right; font-weight: bold; font-size: 18px; color: #059669;">${order.total.toFixed(2)} RON</td>
            </tr>
          </tfoot>
        </table>
      </div>

      ${
        invoicePdfUrl
          ? `
      <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
        <p style="margin: 0 0 12px 0; font-weight: 600; color: #065f46;">📄 Factura ta fiscală</p>
        <a href="${escapeHtml(invoicePdfUrl)}" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">Descarcă factura PDF</a>
      </div>
      `
          : ""
      }

      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #111827;">Ce urmează?</h3>
        <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
          <li style="margin-bottom: 8px;">Comanda ta va fi pregătită pentru livrare în 1-2 zile lucrătoare</li>
          <li style="margin-bottom: 8px;">Vei primi un email cu AWB-ul de la curier</li>
          <li>Livrarea se face în 2-3 zile lucrătoare</li>
        </ul>
      </div>

      <div style="background: #f9fafb; border-radius: 8px; padding: 16px; text-align: center;">
        <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">Ai întrebări? Contactează-ne la:</p>
        <p style="margin: 0; color: #111827; font-weight: 500;">contact@hawaii-woodworking.ro</p>
      </div>

      <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">© ${new Date().getFullYear()} Hawaii Woodworking. Toate drepturile rezervate.</p>
      </div>
    </body>
    </html>
  `;
}
