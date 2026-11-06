import type { OrderWithCustomer } from "./oblio";
import { BUSINESS, SITE_NAME, escapeHtml } from "../../shared/seo/seo.utils";

type OrderItem = OrderWithCustomer["items"][number];

export type InvoiceInfo =
  | { kind: "link"; number: string; url: string }
  | { kind: "simulated"; number: string }
  | { kind: "failed" }
  | { kind: "none" };

export const shortOrderNumber = (id: string): string => id.slice(-8).toUpperCase();

const safeHttpsHref = (url: string): string | null => {
  try {
    if (new URL(url).protocol !== "https:") return null;
    return escapeHtml(url);
  } catch {
    return null;
  }
};

const formatOrderDateRo = (timestamp: number | undefined): string | null => {
  if (timestamp === undefined || !Number.isFinite(timestamp)) return null;
  try {
    return new Intl.DateTimeFormat("ro-RO", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Europe/Bucharest",
    }).format(new Date(timestamp));
  } catch {
    return null;
  }
};

const moneyRows = (order: OrderWithCustomer): string => {
  const rows: string[] = [];
  if ((order.shippingCost ?? 0) > 0) {
    rows.push(`<tr><td colspan="3" style="padding: 8px; text-align: right;">Transport:</td><td style="padding: 8px; text-align: right;">${(order.shippingCost as number).toFixed(2)} RON</td></tr>`);
  }
  if ((order.codFee ?? 0) > 0) {
    rows.push(`<tr><td colspan="3" style="padding: 8px; text-align: right;">Taxă ramburs:</td><td style="padding: 8px; text-align: right;">${(order.codFee as number).toFixed(2)} RON</td></tr>`);
  }
  return rows.join("");
};

const simulatedInvoiceBox = (number: string): string => `
      <div style="background: #fafaf9; border: 1px dashed #d6d3d1; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px 0; font-weight: 600; color: #1c1917;">Mod TEST - factură simulată</p>
        <p style="margin: 0 0 8px 0; color: #57534e;">${escapeHtml(number)}</p>
        <p style="margin: 0; color: #78716c; font-size: 14px;">În producție, aici apare linkul de descărcare a facturii de la Oblio.</p>
      </div>`;

export function generateAdminEmailHtml(
  order: OrderWithCustomer,
  invoice: InvoiceInfo,
  isCod = false,
): string {
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
  `,
    )
    .join("");

  const invoiceBlock = (() => {
    if (invoice.kind === "link") {
      const href = safeHttpsHref(invoice.url);
      return `
      <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px 0; font-weight: 600; color: #065f46;">✅ Factură Oblio generată: ${escapeHtml(invoice.number)}</p>
        ${href ? `<a href="${href}" style="color: #059669; text-decoration: underline;">Descarcă factura PDF</a>` : ""}
      </div>`;
    }
    if (invoice.kind === "simulated") return simulatedInvoiceBox(invoice.number);
    if (invoice.kind === "failed") {
      return "<p>Factura nu a putut fi confirmată. Verifică manual în Oblio înainte de orice reîncercare pentru a evita duplicarea.</p>";
    }
    return "";
  })();

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #f9fafb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
        <h1 style="margin: 0 0 16px 0; color: #111827; font-size: 24px;">🔔 Comandă nouă!</h1>
        <p style="margin: 0; color: #6b7280;">Comandă #${escapeHtml(shortOrderNumber(order._id))}</p>
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
            ${moneyRows(order)}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding: 12px 8px; text-align: right; font-weight: bold;">Total comandă:</td>
              <td style="padding: 12px 8px; text-align: right; font-weight: bold; font-size: 18px;">${order.total.toFixed(2)} RON</td>
            </tr>
          </tfoot>
        </table>
      </div>

      ${isCod ? `<div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 24px;"><p style="margin: 0; font-weight: 600; color: #92400e;">RAMBURS – de încasat ${order.total.toFixed(2)} RON la livrare. Factura se emite manual.</p></div>` : ""}
      ${invoiceBlock}

      <div style="background: #f9fafb; border-radius: 8px; padding: 16px; text-align: center;">
        <p style="margin: 0; color: #6b7280; font-size: 14px;">${escapeHtml(SITE_NAME)} - Sistem automat de notificări</p>
      </div>
    </body>
    </html>
  `;
}

export function generateCustomerEmailHtml(
  order: OrderWithCustomer,
  invoice: InvoiceInfo,
  isCod = false,
  isTest = false,
): string {
  const shipping = order.shipping ?? {
    firstName: order.customer.firstName,
    lastName: order.customer.lastName,
    phone: order.customer.phone,
    address: order.customer.shippingAddress,
  };
  const orderNumber = shortOrderNumber(order._id);
  const orderDate = formatOrderDateRo(order.paymentConfirmedAt ?? order._creationTime);
  const subtotal = order.items.reduce(
    (sum: number, item: OrderItem) => sum + item.price * item.quantity,
    0,
  );
  const itemsHtml = order.items
    .map(
      (item: OrderItem) => `
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e7e5e4; color: #1c1917; font-size: 14px;">
                  ${escapeHtml(item.name)}<br>
                  <span style="color: #78716c; font-size: 13px;">× ${item.quantity}</span>
                </td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e7e5e4; text-align: right; white-space: nowrap; color: #1c1917; font-size: 14px; vertical-align: top;">${(item.price * item.quantity).toFixed(2)} RON</td>
              </tr>`,
    )
    .join("");
  const totalsRows = [
    `<tr><td style="padding: 6px 0; color: #78716c; font-size: 14px;">Subtotal</td><td style="padding: 6px 0; text-align: right; white-space: nowrap; color: #1c1917; font-size: 14px;">${subtotal.toFixed(2)} RON</td></tr>`,
    ...(order.shippingCost !== undefined && order.shippingCost > 0
      ? [`<tr><td style="padding: 6px 0; color: #78716c; font-size: 14px;">Transport</td><td style="padding: 6px 0; text-align: right; white-space: nowrap; color: #1c1917; font-size: 14px;">${order.shippingCost.toFixed(2)} RON</td></tr>`]
      : []),
    ...(order.codFee !== undefined && order.codFee > 0
      ? [`<tr><td style="padding: 6px 0; color: #78716c; font-size: 14px;">Taxă ramburs</td><td style="padding: 6px 0; text-align: right; white-space: nowrap; color: #1c1917; font-size: 14px;">${order.codFee.toFixed(2)} RON</td></tr>`]
      : []),
    `<tr><td style="padding: 12px 0 0 0; border-top: 1px solid #e7e5e4; color: #1c1917; font-weight: bold;">Total</td><td style="padding: 12px 0 0 0; border-top: 1px solid #e7e5e4; text-align: right; white-space: nowrap; color: #1c1917; font-weight: bold; font-size: 16px;">${order.total.toFixed(2)} RON</td></tr>`,
  ].join("");

  const headline = isCod ? "Comanda ta a fost înregistrată" : "Comanda ta a fost confirmată";

  const invoiceBlock = (() => {
    if (invoice.kind === "link") {
      const href = safeHttpsHref(invoice.url);
      if (!href) {
        return `<p style="margin: 0 0 24px 0; color: #1c1917; font-size: 14px;">Factura îți va fi trimisă separat.</p>`;
      }
      return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
        <tr>
          <td style="padding: 16px 0; border-top: 1px solid #e7e5e4; border-bottom: 1px solid #e7e5e4; text-align: center;">
            <p style="margin: 0 0 4px 0; color: #78716c; font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em;">Factură fiscală</p>
            <p style="margin: 0 0 16px 0; color: #1c1917; font-size: 15px; font-weight: 600;">${escapeHtml(invoice.number)}</p>
            <a href="${href}" style="display: inline-block; background: #1c1917; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Descarcă factura (PDF)</a>
          </td>
        </tr>
      </table>`;
    }
    if (invoice.kind === "simulated") {
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;"><tr><td style="padding: 0;">${simulatedInvoiceBox(invoice.number)}</td></tr></table>`;
    }
    if (invoice.kind === "failed") {
      return `<p style="margin: 0 0 24px 0; color: #1c1917; font-size: 14px;">Factura îți va fi trimisă separat.</p>`;
    }
    return "";
  })();

  const preheader = isCod
    ? `Comanda ta #${orderNumber} a fost înregistrată.`
    : `Comanda ta #${orderNumber} a fost confirmată.`;

  return `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(SITE_NAME)}</title>
</head>
<body style="margin: 0; padding: 0; background: #fafaf9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1c1917;">
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fafaf9;">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        ${isTest ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 0 12px 0;"><tr><td style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 10px 14px; color: #92400e; font-size: 13px; text-align: center;">Mediu TEST - nu s-a efectuat nicio plată reală și nu s-a emis nicio factură fiscală.</td></tr></table>` : ""}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background: #ffffff; border: 1px solid #e7e5e4; border-radius: 12px;">
          <tr>
            <td style="padding: 32px 28px;">
              <p style="margin: 0 0 24px 0; color: #78716c; font-size: 12px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase;">${escapeHtml(SITE_NAME)}</p>
              <h1 style="margin: 0 0 8px 0; color: #1c1917; font-size: 24px; font-weight: 700; line-height: 1.3;">${headline}</h1>
              <p style="margin: 0 0 24px 0; color: #78716c; font-size: 14px;">Comandă #${escapeHtml(orderNumber)}${orderDate ? ` · ${escapeHtml(orderDate)}` : ""}</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0; background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 8px;">
                <tr>
                  <td style="padding: 12px 16px; color: #1c1917; font-size: 14px;">${isCod ? "Plată ramburs la livrare" : "Plată confirmată prin card"}</td>
                  <td style="padding: 12px 16px; text-align: right; white-space: nowrap; color: #1c1917; font-size: 14px; font-weight: 600;">${order.total.toFixed(2)} RON</td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 8px 0;">
                ${itemsHtml}
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
                ${totalsRows}
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td style="border-top: 1px solid #e7e5e4; padding: 20px 0 0 0;">
                    <p style="margin: 0 0 4px 0; color: #78716c; font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em;">Adresă de livrare</p>
                    <p style="margin: 0; color: #1c1917; font-size: 14px;">${escapeHtml(shipping.firstName)} ${escapeHtml(shipping.lastName)}</p>
                    <p style="margin: 4px 0 0 0; color: #1c1917; font-size: 14px;">${escapeHtml(shipping.address.street)}</p>
                    <p style="margin: 4px 0 0 0; color: #1c1917; font-size: 14px;">${escapeHtml(shipping.address.city)}, ${escapeHtml(shipping.address.county)}</p>
                    <p style="margin: 4px 0 0 0; color: #1c1917; font-size: 14px;">${escapeHtml(shipping.address.postalCode)}, ${escapeHtml(shipping.address.country)}</p>
                  </td>
                </tr>
              </table>

              ${invoiceBlock}

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0;">
                <tr>
                  <td style="border-top: 1px solid #e7e5e4; padding: 20px 0 0 0;">
                    <p style="margin: 0 0 8px 0; color: #1c1917; font-size: 15px; font-weight: 600;">Ce urmează</p>
                    <p style="margin: 0 0 4px 0; color: #57534e; font-size: 14px;">Pregătim comanda în 1-2 zile lucrătoare.</p>
                    <p style="margin: 0; color: #57534e; font-size: 14px;">Livrarea se face în 2-3 zile lucrătoare.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px;">
          <tr>
            <td style="padding: 20px 8px 0 8px; text-align: center;">
              <p style="margin: 0 0 4px 0; color: #78716c; font-size: 13px;">${escapeHtml(BUSINESS.legalName)}</p>
              <p style="margin: 0 0 4px 0; color: #78716c; font-size: 13px;">${escapeHtml(BUSINESS.email)} · ${escapeHtml(BUSINESS.phoneDisplay)}</p>
              <p style="margin: 12px 0 0 0; color: #a8a29e; font-size: 12px;">© ${new Date().getFullYear()} ${escapeHtml(SITE_NAME)}. Toate drepturile rezervate.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export type OrderNoticeKind =
  | "customer_cancelled"
  | "return_requested"
  | "returned";

export interface OrderNotice {
  // The "returned" notice goes to the customer only; the other two also
  // notify the admin.
  sendToAdmin: boolean;
  adminSubject: string;
  adminHtml: string;
  customerSubject: string;
  customerHtml: string;
}

const noticeReason = (order: OrderWithCustomer, kind: OrderNoticeKind) =>
  kind === "customer_cancelled"
    ? order.cancelReason
    : kind === "return_requested"
      ? order.returnRequestReason
      : order.returnReason;

const noticeAdminTitle: Record<OrderNoticeKind, string> = {
  customer_cancelled: "Comandă anulată de client",
  return_requested: "Cerere de retur",
  returned: "Retur înregistrat",
};

const generateOrderNoticeAdminHtml = (
  order: OrderWithCustomer,
  kind: OrderNoticeKind,
): string => {
  const number = shortOrderNumber(order._id);
  const reason = noticeReason(order, kind);
  const itemsHtml = order.items
    .map(
      (item: OrderItem) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.name)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${(item.price * item.quantity).toFixed(2)} RON</td>
    </tr>`,
    )
    .join("");
  const flags: string[] = [];
  if (order.refundStatus === "manual_required") {
    flags.push("Ramburs manual necesar pentru suma plătită.");
  }
  if (kind === "returned") {
    flags.push(
      order.returnRestocked
        ? "Stocul a fost restabilit în magazin."
        : "Stocul NU a fost restabilit.",
    );
  }
  if (kind === "return_requested" && order.deliveredAt) {
    const delivered = formatOrderDateRo(order.deliveredAt);
    if (delivered) flags.push(`Livrată pe ${escapeHtml(delivered)}.`);
  }
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #f9fafb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
        <h1 style="margin: 0 0 16px 0; color: #111827; font-size: 24px;">${noticeAdminTitle[kind]}</h1>
        <p style="margin: 0; color: #6b7280;">Comandă #${escapeHtml(number)}</p>
      </div>

      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #111827;">Client</h2>
        <p style="margin: 4px 0;"><strong>Nume:</strong> ${escapeHtml(order.customer.firstName)} ${escapeHtml(order.customer.lastName)}</p>
        <p style="margin: 4px 0;"><strong>Email:</strong> ${escapeHtml(order.customer.email)}</p>
        <p style="margin: 4px 0;"><strong>Telefon:</strong> ${escapeHtml(order.shipping?.phone ?? order.customer.phone ?? "")}</p>
      </div>

      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #111827;">Produse</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 12px 8px; text-align: right; font-weight: bold;">Total:</td>
              <td style="padding: 12px 8px; text-align: right; font-weight: bold;">${order.total.toFixed(2)} RON</td>
            </tr>
          </tfoot>
        </table>
      </div>

      ${reason ? `<div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin-bottom: 24px;"><h2 style="margin: 0 0 8px 0; font-size: 18px; color: #111827;">Motiv</h2><p style="margin: 0;">${escapeHtml(reason)}</p></div>` : ""}
      ${flags.length ? `<div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 24px;">${flags.map((flag) => `<p style="margin: 0 0 4px 0; font-weight: 600; color: #92400e;">${escapeHtml(flag)}</p>`).join("")}</div>` : ""}

      <div style="background: #f9fafb; border-radius: 8px; padding: 16px; text-align: center;">
        <p style="margin: 0; color: #6b7280; font-size: 14px;">${escapeHtml(SITE_NAME)} - Sistem automat de notificări</p>
      </div>
    </body>
    </html>
  `;
};

const generateOrderNoticeCustomerHtml = (
  order: OrderWithCustomer,
  kind: OrderNoticeKind,
): { headline: string; paragraphs: string[] } => {
  const number = shortOrderNumber(order._id);
  if (kind === "customer_cancelled") {
    const paragraphs = [`Comanda ta #${escapeHtml(number)} a fost anulată.`];
    if (order.refundStatus === "manual_required") {
      paragraphs.push(
        "Suma plătită îți va fi rambursată manual, prin aceeași metodă de plată, în cel mult 14 zile calendaristice.",
      );
    } else if (order.paymentMethod === "cod") {
      paragraphs.push(
        "Plata era ramburs (la livrare), deci nu ai efectuat nicio plată.",
      );
    }
    return { headline: "Comanda ta a fost anulată", paragraphs };
  }
  if (kind === "return_requested") {
    return {
      headline: "Cererea ta de retur a fost înregistrată",
      paragraphs: [
        `Am primit cererea de retur pentru comanda #${escapeHtml(number)}.`,
        "Te contactăm în cel mai scurt timp pentru a stabili împreună pașii următori.",
      ],
    };
  }
  const paragraphs = [
    `Am înregistrat returul pentru comanda #${escapeHtml(number)}.`,
  ];
  if (order.refundStatus === "manual_required") {
    paragraphs.push(
      `Îți vom rambursa integral suma plătită (${order.total.toFixed(2)} RON). Rambursarea este procesată manual, conform politicii de retur.`,
    );
  }
  return { headline: "Returul a fost înregistrat", paragraphs };
};

export const buildOrderNotice = (
  order: OrderWithCustomer,
  kind: OrderNoticeKind,
  isTest = false,
): OrderNotice => {
  const number = shortOrderNumber(order._id);
  const customerName = `${order.customer.firstName} ${order.customer.lastName}`;
  const adminSubjects: Record<OrderNoticeKind, string> = {
    customer_cancelled: `Comandă anulată #${number} - ${customerName}`,
    return_requested: `Cerere de retur #${number} - ${customerName}`,
    returned: `Retur înregistrat #${number} - ${customerName}`,
  };
  const customerSubjects: Record<OrderNoticeKind, string> = {
    customer_cancelled: `Comanda #${number} a fost anulată - ${SITE_NAME}`,
    return_requested: `Cerere de retur pentru comanda #${number} - ${SITE_NAME}`,
    returned: `Returul pentru comanda #${number} a fost înregistrat - ${SITE_NAME}`,
  };
  const { headline, paragraphs } = generateOrderNoticeCustomerHtml(
    order,
    kind,
  );
  const customerHtml = `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(SITE_NAME)}</title>
</head>
<body style="margin: 0; padding: 0; background: #fafaf9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1c1917;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fafaf9;">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        ${isTest ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 0 12px 0;"><tr><td style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 10px 14px; color: #92400e; font-size: 13px; text-align: center;">Mediu TEST - nu s-a efectuat nicio plată reală și nu s-a emis nicio factură fiscală.</td></tr></table>` : ""}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background: #ffffff; border: 1px solid #e7e5e4; border-radius: 12px;">
          <tr>
            <td style="padding: 32px 28px;">
              <p style="margin: 0 0 24px 0; color: #78716c; font-size: 12px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase;">${escapeHtml(SITE_NAME)}</p>
              <h1 style="margin: 0 0 8px 0; color: #1c1917; font-size: 24px; font-weight: 700; line-height: 1.3;">${headline}</h1>
              <p style="margin: 0 0 24px 0; color: #78716c; font-size: 14px;">Comandă #${escapeHtml(number)}</p>
              ${paragraphs.map((paragraph) => `<p style="margin: 0 0 12px 0; color: #1c1917; font-size: 14px;">${paragraph}</p>`).join("")}
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px;">
          <tr>
            <td style="padding: 20px 8px 0 8px; text-align: center;">
              <p style="margin: 0 0 4px 0; color: #78716c; font-size: 13px;">${escapeHtml(BUSINESS.legalName)}</p>
              <p style="margin: 0 0 4px 0; color: #78716c; font-size: 13px;">${escapeHtml(BUSINESS.email)} · ${escapeHtml(BUSINESS.phoneDisplay)}</p>
              <p style="margin: 12px 0 0 0; color: #a8a29e; font-size: 12px;">© ${new Date().getFullYear()} ${escapeHtml(SITE_NAME)}. Toate drepturile rezervate.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  return {
    sendToAdmin: kind !== "returned",
    adminSubject: adminSubjects[kind],
    adminHtml: generateOrderNoticeAdminHtml(order, kind),
    customerSubject: customerSubjects[kind],
    customerHtml,
  };
};
