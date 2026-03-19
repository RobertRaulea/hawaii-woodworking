# Quick Start: Order Automation

## What Was Implemented

✅ **Automatic email notifications** when orders are paid
✅ **Oblio invoice generation** for Romanian e-invoicing compliance
✅ **Admin notifications** with full order details
✅ **Customer thank-you emails** with invoice PDF attached

## Required Setup (5 minutes)

### 1. Get Resend API Key
- Sign up at [resend.com](https://resend.com)
- Create API key → Copy it
- Add your domain and verify DNS

### 2. Get Oblio API Credentials
- Sign up at [oblio.eu](https://www.oblio.eu)
- Settings → API
- Copy API Email, Secret, and CIF

### 3. Set Environment Variables in Convex Dashboard

Go to **Convex Dashboard → Settings → Environment Variables**:

```
RESEND_API_KEY=re_your_key_here
ADMIN_EMAIL=your-email@example.com
RESEND_FROM_EMAIL=noreply@yourdomain.ro
OBLIO_API_EMAIL=your_api_email@example.com
OBLIO_API_SECRET=your_api_secret_token
OBLIO_API_CIF=RO12345678
```

### 4. Deploy

```bash
npx convex dev
```

## Testing

1. Place a test order on your site
2. Use Stripe test card: `4242 4242 4242 4242`
3. Check emails (admin + customer)
4. Verify invoice in Oblio dashboard

## What Happens on Each Order

```
Customer pays → Stripe webhook → Mark order paid
                                      ↓
                              Create Oblio invoice
                                      ↓
                              Email admin (order details)
                                      ↓
                              Email customer (thank you + invoice)
```

## Files Changed

- `convex/schema.ts` - Added invoice fields
- `convex/orders.ts` - Added setInvoiceData mutation
- `convex/postPayment.ts` - **NEW** - Main automation logic
- `convex/stripeWebhook.ts` - Triggers postPayment
- `package.json` - Added resend dependency

## Next Steps (Phase 2)

🚚 **Courier AWB automation** - Tell me which courier:
- Fan Courier
- Cargus  
- Sameday
- Other

## Troubleshooting

**No emails?**
- Check Convex logs: `npx convex logs`
- Verify Resend domain is verified
- Check Resend dashboard → Logs

**No Oblio invoice?**
- Verify Oblio credentials
- Check Oblio account has invoice quota
- Review Convex logs for API errors

**Need help?**
- Full docs: `docs/order-automation-setup.md`
- Check Convex logs for detailed errors
