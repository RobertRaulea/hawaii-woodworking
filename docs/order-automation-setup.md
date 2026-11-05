# Order Automation Setup Guide

> Provider setup reference. For current environment boundaries and guarded publication, use [the environment runbook](environments.md). On TEST, post-payment sends real Resend emails with a simulated invoice and never calls Oblio; do not use `npx convex dev` or provider changes as incidental validation.

This guide explains how to configure email notifications, Oblio invoice generation, and courier AWB automation for the Hawaii Woodworking store.

## Overview

When a customer completes a payment via Stripe, the system automatically:

1. ✅ Marks the order as "paid" in the database
2. 📧 Sends an admin notification email with order details
3. 🧾 Creates an invoice in Oblio (Romanian e-invoicing platform); on TEST the invoice is simulated and Oblio is never called
4. 📨 Sends a confirmation email to the customer with the invoice PDF (on TEST, a simulated invoice note instead)
5. 🚚 *(Phase 2)* Generates a courier AWB label

---

## Phase 1: Email + Oblio Invoice (Implemented)

### Step 1: Create a Resend Account

1. Go to [resend.com](https://resend.com) and sign up
2. Navigate to **API Keys** and create a new API key
3. Copy the API key (starts with `re_...`)
4. Go to **Domains** and add your sending domain (e.g., `hawaii-woodworking.ro`)
5. Follow DNS verification steps (add TXT/CNAME records to your domain)

### Step 2: Create Oblio API Credentials

1. Sign up at [oblio.eu](https://www.oblio.eu)
2. Complete your company profile (CUI, address, bank details)
3. Go to **Settings** → **API**
4. Generate API credentials and copy:
   - API Email
   - API Secret
   - Your company CIF
5. Ensure your Oblio account has:
   - Company details configured (CUI, address, etc.)
   - Default VAT rate set (19% for most products in Romania)
   - Invoice series configured

### Step 3: Configure Convex Environment Variables

Go to your Convex dashboard → **Settings** → **Environment Variables** and add:

| Variable | Value | Example |
|----------|-------|---------|
| `RESEND_API_KEY` | Your Resend API key | `re_123abc...` |
| `ADMIN_EMAIL` | Your notification email | `admin@hawaii-woodworking.ro` |
| `RESEND_FROM_EMAIL` | Verified sender email | `noreply@hawaii-woodworking.ro` |
| `OBLIO_API_EMAIL` | Oblio API email | `your_api_email@example.com` |
| `OBLIO_API_SECRET` | Oblio API secret | `your_api_secret_token` |
| `OBLIO_API_CIF` | Your company CIF | `RO12345678` |

**Important:** `RESEND_FROM_EMAIL` must be from a domain you've verified in Resend.

### Step 4: Publish the approved backend

For TEST, follow [the environment runbook](environments.md) and run:

```bash
npm run test:sync
```

Production deployment and provider activation require separate approval and the production runbook; do not use `npx convex dev` as an incidental validation step.

### Step 5: Test the Flow

On TEST, `handlePostPayment` sends the real admin and customer emails through Resend and shows a simulated invoice (`TEST-XXXXXXXX`) in the customer email; Oblio is never called and no invoice data is persisted. Set `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `ADMIN_EMAIL` on the TEST Convex deployment, then pay with a Stripe test card and check both inboxes (subjects are prefixed `[TEST]`). If the Resend variables are missing, TEST logs an info message and skips the emails. Real Oblio invoices exist only on production; do not create real invoices as a smoke test.

### Known limits

- A failed email or Oblio call is logged and not retried. A failed invoice needs manual verification before any retry, to avoid duplicates. The invoice request carries `idempotencyKey` set to the order id so Oblio cannot issue a second invoice for the same order.
- A refund creates no Oblio credit note (storno) and no customer email; refunds are manual.

---

## How It Works

### Webhook Flow

```
Stripe Payment Success
    ↓
Stripe sends webhook to /api/stripe-webhook
    ↓
stripeWebhook.ts verifies signature
    ↓
markOrderPaid() updates order status
    ↓
handlePostPayment() triggers:
    ├─ Create Oblio invoice
    ├─ Send admin email
    └─ Send customer email
```

### Files Modified

- `convex/schema.ts` - Added `invoiceId` and `invoicePdfUrl` to orders
- `convex/orders.ts` - Added `setInvoiceData` mutation
- `convex/postPayment.ts` - **New file** with Oblio + email logic
- `convex/stripeWebhook.ts` - Triggers `handlePostPayment` after payment
- `package.json` - Added `resend` dependency

---

## Email Templates

### Admin Email

- Subject: `Comandă nouă #ORDER123 - John Doe` (on TEST: `[TEST] Comandă nouă #ORDER123 - John Doe`)
- Contains:
  - Customer details (name, email, shipping address)
  - Order items with quantities and prices
  - Total amount
  - Link to the Oblio invoice PDF (on TEST, a simulated invoice note instead)

### Customer Email

- Subject: `Comanda #ORDER123 a fost confirmată - Hawaii Woodworking` (COD: `... a fost înregistrată ...`; on TEST both are prefixed `[TEST] `)
- Contains:
  - Order number, date, and payment confirmation (card) or ramburs amount
  - Order items, subtotal, transport/ramburs fees, and total
  - Shipping address confirmation
  - Link to download the invoice PDF (on TEST, a "Mod TEST - factură simulată" box instead; if invoice creation failed, a note that the invoice will be sent separately)
  - Next steps (preparation and shipping timeline)

---

## Troubleshooting

### No emails received

1. Check Convex logs for errors: `npx convex logs`
2. Verify environment variables are set correctly
3. Check Resend dashboard → **Logs** for delivery status
4. Ensure sender domain is verified in Resend

### Oblio invoice not created

1. Check Oblio API credentials are correct
2. Verify your Oblio account is active and has invoice quota
3. Check Convex logs for Oblio API error messages
4. Ensure company details are configured in Oblio

### Webhook not triggering

1. Verify Stripe webhook is configured with correct URL
2. Check `STRIPE_WEBHOOK_SECRET` is set in Convex
3. Test webhook manually in Stripe dashboard
4. Check Convex logs for webhook verification errors

---

## Phase 2: Courier AWB (Coming Soon)

Once you confirm which courier company to use (Fan Courier, Cargus, Sameday, etc.), we'll add:

- Automatic AWB generation after invoice creation
- AWB PDF emailed to admin
- AWB tracking number stored in order
- Customer notification with tracking link

**Next step:** Provide courier company name and API credentials.

---

## Security Notes

- Never commit `.env` files to git
- Store all API keys in Convex environment variables (not in code)
- Use test mode for Stripe/Oblio during development
- Verify webhook signatures to prevent unauthorized requests

---

## Support

For issues or questions:
- Check Convex logs: `npx convex logs`
- Review Stripe webhook logs in dashboard
- Check Resend email delivery logs
- Contact Oblio support for invoice issues
