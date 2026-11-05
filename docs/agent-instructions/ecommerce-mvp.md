# Ecommerce MVP Checklist

Goal: sell safely in Romania as soon as possible. Scope: legal Romania, payments and orders, shipping and invoicing. Everything else is "not now" unless it blocks a sale. Status below comes from a code audit on 2026-11-04 (file paths are evidence). It is a snapshot, not proof of the current revision: re-check the code before relying on a row.

Statuses: **exists**, **partial**, **missing**. Blocker = must be resolved before real sales.

## Launch blockers

| # | Item | Status | Evidence | What is needed from Robert |
| --- | --- | --- | --- | --- |
| 1 | Production payment is blocked in code | partial | `convex/checkout.ts` throws when `APP_ENV=production`; `src/pages/Checkout/Checkout.tsx` `productionPaymentBlocked` | Decide the shipping tariff, then a code change removes the block. `CHECKOUT_ENABLED=true` alone is not enough |
| 2 | Shipping cost is not charged | partial | Flat tariff configurable in admin (`convex/shipping.ts`, `/admin/shipping`) and charged in TEST via a Stripe "Transport" line item; production gate still on; courier tariff (Sameday/Cargus/FAN) pending | Choose courier + real tariff for production |
| 2b | Cash on delivery (ramburs) | TEST only | `convex/codOrders.ts placeCodOrder` places the order and allocates stock without payment; blocked in production by the same gate; no Oblio auto-invoice | COD fiscal invoice is manual (no Oblio auto-invoice for COD); owner decision to open in production |
| 3 | Backup procedure | missing | Only a manual step in `docs/environments.md` | Choose a backup method and document it |
| 4 | Fiscal setup (Oblio, non-VAT payer) | needs activation | `convex/lib/oblio.ts`, `convex/postPayment.ts`; TEST simulates the invoice and sends real emails | Accountant confirmation; production Oblio and Resend credentials entered by Robert |
| 5 | Customer email promises an AWB email that does not exist | resolved | `convex/postPayment.ts`, `convex/lib/orderEmails.utils.ts` | Sentence removed; only preparation and delivery estimates are promised |
| 6 | ANPC SAL pictogram | partial | `public/images/anpc-sal.svg` is not referenced; Footer has a text link only | Confirm the pictogram requirement (250x50 px, first page) |

## Legal Romania

| Item | Status | Evidence |
| --- | --- | --- |
| Privacy policy (GDPR) | exists | `src/pages/Legal/PrivacyPolicy.tsx` |
| Cookie and analytics consent (opt-in, DNT/GPC) | exists | `src/components/Analytics/AnalyticsConsent.tsx`, `src/utils/analytics.utils.ts` |
| Terms and Conditions | exists | `src/pages/Legal/TermsAndConditions.tsx` |
| 14-day right of withdrawal | exists | `src/pages/Legal/ReturnPolicy.tsx` |
| Company identification | exists | `Footer.tsx`, `LegalInformation.tsx`, `BUSINESS` in `shared/seo/seo.utils.ts` |
| Newsletter consent (unticked by default) | exists | `src/pages/Shipping/Shipping.tsx` |
| SOL/ODR link | removed on purpose | A test in `tests/ui/LegalContent.test.tsx` asserts absence |

Legal pages are hardcoded Romanian. Do not paraphrase or "improve" the wording; changes need Robert's approval and a check of the legal test.

## Payments and orders

| Item | Status | Evidence |
| --- | --- | --- |
| Stripe Checkout session | exists | `convex/checkout.ts` |
| Webhook signature and mode check | exists | `convex/stripeWebhook.ts`, `convex/stripeVerify.ts` |
| Webhook idempotency | exists | `convex/orders.ts` `markOrderPaid` |
| Order and inventory state model | exists | `convex/lib/orders.utils.ts`, `convex/lib/inventory.utils.ts` |
| Stock allocated at payment, not at checkout start | by design | Pending orders do not hold stock |
| Refunds | partial | Manual in the Stripe dashboard; `refundStatus: "manual_required"`; no refund webhook |
| Abandoned or expired checkouts | partial | Pending orders stay pending; cleanup is not now |
| Test coverage of money and stock paths | exists | `tests/orders-stock.test.mjs`, `tests/checkout-confirmation.test.mjs`, `tests/e2e-integration.test.mjs` (fixture-based, not live) |

## Shipping, invoicing, email

| Item | Status | Evidence |
| --- | --- | --- |
| Shipping address and RO county/locality validation | exists | `src/pages/Shipping/Shipping.tsx`, `src/constants/romania.constants.ts` |
| Courier and AWB | manual | `convex/fulfillment.ts` accepts optional manual `awb` and `carrier`; no courier API |
| Oblio invoice after payment | exists | `convex/postPayment.ts`; production creates a real Oblio invoice (`idempotencyKey` = order id); TEST simulates it without calling Oblio; failure is logged and needs manual verification; no retry; no storno on refund |
| Admin and customer order emails (Resend) | exists | `convex/postPayment.ts`, `convex/lib/orderEmails.utils.ts`; TEST sends real emails with `[TEST]` subjects; failures are caught and logged, not retried |
| Shipped, delivered, refund emails | missing | Not implemented |

## Not now (do not build without Robert asking)

Courier API integration, automatic refunds or storno, abandoned-cart recovery, guest order tracking, multi-country shipping, multi-language legal pages, Sentry or alerting, rate limiting on checkout (cheap, but not a blocker), marketplace feeds, in-admin analytics page.

## Rules when touching this area

- Do not invent tariffs, VAT treatment, company data, or payment methods. Ask or list them as blockers.
- Do not clear the production payment gate as part of an unrelated change. Removing it is a deliberate launch step with Robert's approval.
- Never run real payments, invoices, emails, or shipments as a smoke test. Use Stripe test cards on TEST only.
- A fix to one launch item belongs in its own conversation; update this checklist when an item's status changes.
