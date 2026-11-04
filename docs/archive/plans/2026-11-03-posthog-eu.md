# PostHog EU Implementation Plan

**Goal:** Add optional, consent-based traffic and storefront funnel instrumentation, with reports in the external PostHog dashboard (option 4a).

**Architecture:** Keep the existing React Router, Clerk and Convex boundaries. Lazy-load the pinned browser SDK only after explicit consent. Confirm purchases exclusively in the existing Stripe-confirmed mutation, scheduling optional analytics independently from fulfillment. Never activate providers or deploy as part of implementation.

**Tech Stack:** React 18, TypeScript strict, Vite, React Router 7 declarative, posthog-js 1.439.1, Convex.

## 1. Privacy and Measurement Contract

Authoritative executable definitions: `shared/analytics.ts` and `src/utils/analyticsPolicy.utils.ts`. These define event names, safe property values, route masking, environment binding and the SDK configuration. Do not substitute a generic autocapture integration.

- Opt-in only, 180-day versioned consent; respect Do Not Track and Global Privacy Control.
- No SDK load, analytics identifier, event queue or request before consent.
- No session replay, autocapture, surveys, flags or automatic exception payloads.
- Never send form values, product names, customer/order/payment identifiers, raw URLs, hashes or search terms.
- Only a validated product id, bounded quantities, fixed enums and sanitized browser dimensions enter client action events.
- Use separate EU projects for TEST and production; environment markers must agree.
- Missing configuration is a production no-op. Explicitly enabled but incomplete configuration reports the prescribed error in development without breaking the storefront.

## 2. Client Integration and Consent

Create `src/utils/analytics.utils.ts`, `src/components/Analytics/Analytics.tsx` and `AnalyticsConsent.tsx`. Wire them inside the existing router; do not add another router/provider dependency.

Client API:

```ts
initializeAnalytics(): Promise<void>
trackAnalytics(event: ClientAnalyticsEvent, properties?: AnalyticsProperties): void
trackAnalyticsPage(pathname: string, search: string): void
identifyAnalytics(userId: string): void
resetAnalyticsIdentity(): void
getAnalyticsContext(): AnalyticsContext | undefined
getAnalyticsConsent(): AnalyticsConsent
setAnalyticsConsent(consent: 'accepted' | 'rejected'): void
subscribeAnalytics(listener: () => void): () => void
```

Use an injected SDK loader in the lower-level controller for offline tests. On rejection or withdrawal: immediately gate all captures and context, cancel in-flight initialization through a generation check, opt out/reset SDK persistence, discard all queued events. Never replay pre-consent actions. Reopen settings with a persistent accessible button; refusal must be as easy as acceptance. Reflect cross-tab changes.

Pageviews use a React Router observer and the SDK's `$pageview` event, not unsanitized automatic history capture. StrictMode must not duplicate a navigation. Known product/order/admin detail URLs become route templates. Capture one current page when consent changes to accepted.

Identify only Clerk subject ids after consent; do not infer a login from an already authenticated page reload. Capture `login_completed` only on an observed signed-out to signed-in transition; explicit verified signup captures `signup_completed` after session activation.

RTL cases: reject/accept/reopen/revoke, keyboard and three languages, DNT/GPC, StrictMode, route transitions including sensitive query/hash, and storage failures. Controller cases: disabled/incomplete configuration, blocked SDK import, revocation during loading, no queued pre-consent events, safe identity reset and SDK privacy options.

## 3. Instrument Actions

- Product detail: `product_viewed` on a real loaded product, not on failed queries.
- Cart context: `add_to_cart` only after successful stock validation; never failed attempts.
- Footer contact links: `cta_clicked` with a fixed `contact_email` / `contact_phone` name, never a copied href or contact value.
- Cart page: `cart_viewed`; cancellation return: `checkout_returned_from_stripe`, explicitly not proof of a financial cancellation.
- Shipping: `form_submitted` only for a valid form proceeding to checkout; verified account creation: `signup_completed`.
- Checkout: pass optional `AnalyticsContext` through existing Convex action arguments (Convex RPC does not expose custom per-call tracing headers); `checkout_started` only after receiving a usable Stripe URL. Failure: `checkout_initiation_failed`, no raw error message.
- Window errors and unhandled rejections: generic `application_error` codes only; never stack/message capture.

## 4. Confirmed Server Purchase

Lead-authored backend event construction and tests must preserve payment, stock and post-payment idempotency.

- Validate optional consent/context against `requirePaymentEnvironment().name`; discard invalid attribution without rejecting a payment.
- Store only the minimal context with the pending order.
- Schedule one internal analytics action in the first confirmed-payment transaction, including `needs_review` and paid-after-cancellation states.
- Never schedule on a replayed webhook, inventory reconciliation or page view.
- Send `purchase_completed` from a frozen trusted order snapshot: amount converted via existing cents utility, quantity sum, currency RON, inventory state and payment timestamp. No customer/order/session/payment identifiers except pseudonymous browser attribution.
- Use a stable UUID insert id for deduplication. Retry transient transport failures with the same event id and timestamp; bound retries. No retry or throw may affect payment/stock/fulfillment.
- No analytics context or configuration means no event; never mint customer identity to bypass consent.

Tests: duplicate/concurrent webhook, pending/no-consent/legacy orders, needs-review and cancelled paid states, environment mismatch, exact payload, timeout/transient/permanent failures, no PII, stable retry identity, authorization of internal-only entrypoints.

## 5. Metadata and Performance

Complete translated title/description metadata for shipping, checkout, thank-you and legal routes; maintain noindex for transactional routes and all TEST pages. Translate new user-facing copy in RO/EN/DE. Do not claim all legacy legal/admin translations are complete without a full inventory.

Keep Home eagerly loaded. Lazy-load the remaining eager Products route and analytics SDK. Do not bump dependencies or add an artificial chunk warning limit.

## 6. External Dashboard Runbook

Document setup, environment variables and manually reproducible PostHog insights: pageviews, unique consenting visitors, sessions, pages, safe source/device breakdowns and product-to-purchase funnel. Separate staff traffic and TEST. Use server purchase amounts as gross confirmed payments, not net sales/refunds. Do not equate `/thank-you`, Stripe cancellation returns or client checkout errors with a financial result.

Do not create remote resources, choose retention on behalf of the owner, upload sourcemaps, activate replay or put a personal API key in Vite.

## 7. Final Local Gate

Delegate focused tests first and one full final gate:

```sh
npm test
npm run lint
./node_modules/.bin/tsc -p tsconfig.app.json --noEmit
./node_modules/.bin/tsc -p convex/tsconfig.json --noEmit
npm run build:test
```

Browser smoke: use an existing local server if alive, otherwise start Vite only. Use network interception and fixture PostHog tokens for consent tests, not real ingestion. Preserve runtime processes for follow-up. Do not sync Convex or write any shared TEST/production data. Real Clerk-admin, Stripe/provider and PostHog ingestion checks remain pending owner authorization and configuration.

No commits, pushes or deployments are part of this phase unless explicitly requested.
