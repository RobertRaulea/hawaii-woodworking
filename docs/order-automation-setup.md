# Order Automation Setup Guide

This guide explains how to configure email notifications, Oblio invoice generation, and courier AWB automation for the Hawaii Woodworking store.

## Overview

When a customer completes a payment via Stripe, the system automatically:

1. ✅ Marks the order as "paid" in the database
2. 📧 Sends an admin notification email with order details
3. 🧾 Creates an invoice in Oblio (Romanian e-invoicing platform)
4. 📨 Sends a thank-you email to the customer with the invoice PDF
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

### Step 4: Deploy to Convex

```bash
npx convex dev
```

The system will automatically:
- Regenerate Convex API types
- Deploy the new functions
- Start listening for Stripe webhooks

### Step 5: Test the Flow

1. Place a test order on your site
2. Complete payment with a Stripe test card (`4242 4242 4242 4242`)
3. Check your admin email for the order notification
4. Check the customer email for the thank-you message
5. Verify the invoice was created in Oblio

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

- Subject: `🔔 Comandă nouă #123456 - John Doe`
- Contains:
  - Customer details (name, email, shipping address)
  - Order items with quantities and prices
  - Total amount
  - Link to Oblio invoice PDF

### Customer Email

- Subject: `Mulțumim pentru comandă! 🌺`
- Contains:
  - Personalized greeting
  - Order summary
  - Shipping address confirmation
  - Link to download invoice PDF
  - Next steps (preparation, shipping timeline)

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
