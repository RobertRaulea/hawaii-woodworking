# PostHog EU: Tracking and External Reports

Status: local implementation, disabled by default. No PostHog project, dashboard, retention setting or remote environment has been created or activated by this work.

The owner chose option 4a: reports in the private PostHog dashboard, not a second reporting page inside the shop's admin.

## What the Numbers Mean

These are proposed report definitions, not measured results or existing approved project metrics. No project/data catalog was available to inspect. Before saving production reports, check whether the owner's PostHog project already has approved metric definitions and reconcile these proposals with them.

- A visitor is a consenting browser's pseudonymous identity, possibly merged with its authenticated Clerk subject. It is not a verified unique human.
- Pageviews start only after consent. They exclude blocked requests, nonconsenting visitors, bots filtered by the SDK and pages viewed before consent. There is no backfill of earlier activity.
- A pageview counts a pathname transition, not a query/hash change. Product, order and admin detail paths are masked route templates.
- `checkout_started` means the app received a usable Stripe URL. It does not prove that Stripe loaded, accepted a card or received money.
- `purchase_completed` means the backend accepted the first Stripe-confirmed payment and scheduled optional telemetry. Stock may still require review, and a cancelled order can have received a late payment.
- Gross confirmed payments are not net revenue, fulfilled sales, profit, settled bank transfers or refunded totals.
- Analytics is not the accounting source of truth. Use Convex/Stripe/Oblio for reconciliation. A payment can succeed even if its analytics event is dropped.

## Activation Checklist: Separate Approval Required

1. Create or select separate EU PostHog projects for TEST and production. Keep their project tokens distinct. Confirm the project URL with the owner; do not guess ids.
2. Keep dashboards private. Grant only the staff accounts that need them; never create a public sharing link or iframe containing customer activity.
3. Review the provider agreement, processing inventory, access controls, retention and IP handling with the operator. `$geoip_disable` disables geolocation enrichment, not the fact that a network connection has an IP address. Configure any required IP redaction through provider settings/transformations; do not use the deprecated/no-op `ip: false` option.
4. Leave session recording, autocapture, surveys and feature flags disabled. They are not required for these reports.
5. Add the public project token and EU ingestion host to the approved frontend environment. Never put a personal API key in Vite or send one in chat.
6. Set the matching project token and marker in that environment's Convex deployment settings. The browser and backend must send to the same project.
7. Make a coordinated, separately approved TEST release. The new optional checkout argument and optional order field require backend support before an enabled frontend sends attribution.
8. Verify with a legitimate consenting TEST session and approved Stripe sandbox transaction. Confirm one server purchase for repeated delivery of the same webhook; do not test by visiting `/thank-you`.
9. Inspect real events for unexpected properties, unknown sources and staff traffic before saving the reports below. Confirm actual provider retention in the privacy notice before production activation.
10. Request production approval separately. The pending shipping tariff continues to block live checkout; analytics work does not remove that guard.

Do not set real environment values or run a deploy/sync command merely to follow this document.

### Frontend Settings

Use the hosting environment or ignored `.env.local` for an explicitly approved local TEST setup:

```dotenv
VITE_PUBLIC_POSTHOG_ENABLED=false
VITE_PUBLIC_POSTHOG_KEY=
VITE_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
VITE_PUBLIC_POSTHOG_ENV=test
```

`VITE_APP_ENV` remains the authoritative application environment. `VITE_PUBLIC_POSTHOG_ENV` must match it. Enable only with the correct project's public `phc_` token. Enabled but incomplete configuration logs an explicit error in development without breaking the shop. Production stays a no-op. Disabled configuration is intentionally silent.

### Backend Settings

These belong in the corresponding Convex deployment, not `VITE_*` or a committed file:

```dotenv
POSTHOG_ENABLED=false
POSTHOG_KEY=
POSTHOG_HOST=https://eu.i.posthog.com
POSTHOG_ENV=test
```

Use `production` markers only in the approved production projects. Existing backend environment validation still checks `APP_ENV`, deployment URL and Clerk issuer.

Convex uses its existing action RPC/WebSocket interface, not a custom HTTP checkout endpoint. Per-call `X-POSTHOG-DISTINCT-ID` / `X-POSTHOG-SESSION-ID` headers are therefore not fabricated: the equivalent minimal, optional `analytics` argument carries consent, pseudonymous distinct id, session id and environment. It never goes into Stripe metadata.

## Consent and Data Minimization

- Analytics is optional; refusal does not prevent browsing or checkout.
- The versioned choice is stored locally for up to 180 days. The analytics SDK loads only after explicit acceptance with valid enabled configuration.
- Do Not Track and Global Privacy Control override acceptance.
- The statistics settings button permits refusal, acceptance and withdrawal. Cross-tab changes and consent expiry also stop collection.
- Vendor persistence is memory-only: its internal session-attribution cache must never write raw URLs/referrers to disk. The app persists only a versioned environment marker, anonymous UUID, session UUID and last-activity timestamp after consent.
- Safe SDK bootstrapping preserves anonymous visitor identity and an active session across reloads (30-minute idle timeout, 24-hour session maximum). Identity is cleared on withdrawal, expiry, reset and before merging an anonymous identity into a Clerk subject; identified sessions can restart on reload and should not be interpreted as uninterrupted human visits.
- Rejection stops future browser capture and clears SDK identity persistence; it cannot retract requests already transmitted. An in-flight checkout's attribution is a snapshot of consent at initiation; downstream processing/erasure requests require operator handling. No public unauthenticated analytics-deletion endpoint is introduced.
- Session replay and automatic DOM/form/exception capture remain off. Generic application error codes are sent without error messages, stacks or provider response bodies.
- Only Clerk subject ids are used for authenticated identity; email, name, phone, address, passwords, card data, raw order ids and Stripe session/payment ids are excluded from event payloads.
- Full URLs, hashes, query strings, titles, search terms, `utm_campaign`, advertising click ids and arbitrary campaign text are not collected. Route templates, referrer origin and a finite `utm_source`/`utm_medium` vocabulary remain.

Allowed sources: `google`, `facebook`, `instagram`, `bing`, `linkedin`, `newsletter`, `direct`; other supplied values become `other`. Allowed media: `organic`, `cpc`, `paid_social`, `email`, `referral`, `social`; other supplied values become `other`. Missing parameters stay missing, not automatically `direct`.

These intentionally limited dimensions do not provide full ad attribution, campaign ROI or named anonymous visitors.

## Event Taxonomy

Every event has an application `environment`. Browser context is sanitized again at the SDK's final send boundary.

| Event | Trigger | Allowed business context | Interpretation |
| --- | --- | --- | --- |
| `$pageview` | Consented current page or pathname transition | `route_path`, `surface`, safe source/medium | Masked page traffic, not all requests |
| `product_viewed` | A real product has loaded | `product_id`, `surface` | Product impressions, not error/loading views |
| `add_to_cart` | A successful cart addition after stock checks | `product_id`, `quantity`, `surface` | Units added, not cart mutations or rejected attempts |
| `cart_viewed` | Cart displayed in an active consent epoch | `item_count`, `surface` | `item_count` is total units, not distinct lines |
| `form_submitted` | Valid shipping data proceeds to checkout | `form_name=shipping`, `surface` | No field contents |
| `cta_clicked` | Footer email/phone contact link is activated | `cta_name=contact_email` or `contact_phone`, `surface` | Contact intent, not proof of a sent message or completed call |
| `signup_completed` | Verification completes and Clerk session activation succeeds | `method=clerk`, `surface` | Not account-creation attempt or email-code dispatch |
| `login_completed` | Observed signed-out to signed-in transition | `method=clerk` | Authenticated session start, including signup; not an already-signed-in reload |
| `checkout_started` | A usable Stripe checkout URL is returned | `surface=checkout` | Initiation, not payment success |
| `checkout_initiation_failed` | Initiation throws or no usable URL is returned | Fixed `error_code`, `surface=checkout` | Not a card decline or definitive payment failure |
| `checkout_returned_from_stripe` | Cart contains the cancellation return marker | `return_reason=cancelled`, `surface` | An untrusted navigation marker, not a financial cancellation |
| `application_error` | Window error or unhandled rejection | Fixed `error_code` | Generic signal only; no full exception monitoring |
| `purchase_completed` | First confirmed-payment transaction | RON amount, total units, inventory state, cancellation-at-confirmation flag | Backend only; see definition below |

### Confirmed Purchase Payload

`amount_cents` comes from the trusted pending-order total using the existing cents conversion; `value = amount_cents / 100`, `currency = RON`, and `item_count` is the sum of ordered quantities. The current checkout total is products only: shipping tariff is unconfirmed and production checkout is blocked.

The event includes pseudonymous browser/session attribution, `inventory_status`, `order_cancelled_at_confirmation` and `source=stripe_webhook`. It excludes raw customer, order, Stripe and invoice identifiers.

The event's UUID is deterministically hashed from its private order key. UUID, timestamp, distinct id and event name remain identical across transport retries. PostHog deduplication is eventual; a dashboard may briefly show duplicates before ingestion/background merges settle. Do not use the live chart as a real-time financial ledger.

The frozen snapshot is scheduled only on the first confirmation, including `needs_review` and paid-after-cancellation states. Repeated webhooks, stock reconciliation and thank-you visits do not schedule another purchase. Historical payments are not retroactively backfilled.

Network failures, HTTP 429 and HTTP 5xx receive two bounded retries (3 seconds and 15 seconds); each request has a 4-second timeout. Other HTTP failures are discarded. Retry scheduling and delivery failures must not block payment, stock or fiscal/email automation. Without consent context or valid enabled backend configuration, no purchase event is sent.

## Dashboard Recipes

Suggested dashboard: **Hawaii - Traffic and Storefront Funnel**. These recipes require real project access and event verification; no dashboard was provisioned automatically.

Start with a closed, fully ingested date range. Set the project/report timezone consistently to Europe/Bucharest where supported. Use the production project plus `environment=production`; use only TEST data during sandbox validation. Do not compare a partial current day against complete previous days.

For traffic charts, include pageviews whose `surface` is one of `storefront`, `shipping`, `checkout`. Put `surface=admin` in a separate staff report. Filters belong on the relevant series: a global `surface` condition can accidentally remove server purchases, which have no client `surface`.

1. **Daily pageviews:** Trends, event `$pageview`, total count, daily intervals. Break down by `route_path` for top pages.
2. **Daily consenting visitors:** same pageview filters, unique users. Label as estimated consenting identities. Do not add daily uniques together to claim monthly unique visitors.
3. **Observed sessions:** use PostHog session reporting for those filtered events; inspect `$session_id` availability first. Do not derive sessions by counting pageviews or login events.
4. **Source and device:** pageview unique users broken down separately by `$referring_domain`, `utm_source`, `utm_medium` and `$device_type`. Missing source is unknown/unset; a cross-origin referrer or ad blocker can remove attribution.
5. **Product interest:** `product_viewed` total count and `add_to_cart` total count, each broken down by `product_id`. These are event counts, not units; sum `quantity` only when explicitly reporting units added.
6. **Storefront funnel:** ordered unique-user funnel `product_viewed` -> `add_to_cart` -> `cart_viewed` -> `checkout_started` -> `purchase_completed`, proposed 24-hour conversion window. Label this as a site-level journey: purchase events do not contain a per-product breakdown, so do not claim product-specific purchase conversion.
7. **Checkout-to-payment funnel:** ordered unique-user funnel `checkout_started` -> `purchase_completed`, proposed 24-hour window. Evaluate only cohorts whose full window has elapsed; recent starts remain pending, not failed. Users initiating elsewhere or losing consent/context may not join.
8. **Gross confirmed payments:** `purchase_completed`, `source=stripe_webhook`, sum of numeric `value`, currency RON. Keep `needs_review` and cancellation-at-confirmation breakdowns visible. This is not net sales; no automatic refund subtraction exists.
9. **Initiation reliability:** show the raw `checkout_started` and `checkout_initiation_failed` event counts alongside each other. Do not call this a card failure rate or abandoned-checkout total. Reloads/attempts and pending outcomes prevent a simple visitor conversion inference.
10. **Staff usage:** separate dashboard/tab, `$pageview` where `surface=admin`, broken down by masked `route_path`. This covers module visits, not every POS/inventory/customer action.

Do not subtract unique users between different charts to calculate abandonment. Use an ordered funnel with the same population, period and matured conversion window. Do not add signup and login counts to derive account growth; verified signups can also start an authenticated session.

Bounce rate, session duration and advanced acquisition reports need separate validation because automatic pageleave/history tracking and arbitrary URL/campaign capture are deliberately disabled.

## Local Validation and Remaining Release Checks

Local tests use fake SDKs and mocked HTTP responses, not production traffic. Browser packet inspection must intercept ingestion so fixture events do not enter a real project.

The local gate is `npm test`, `npm run lint`, both application/backend TypeScript checks, and `npm run build:test`. A successful gate is not deployment approval.

Implementation checkpoint (local, uncommitted source; not a deployment status):

- Initial full gate passed: 211 unit/backend tests and 251 UI tests, both TypeScript checks and TEST build.
- After the additional SDK persistence hardening: 32 targeted privacy/backend checks, 99 focused UI tests, frontend TypeScript, touched-file lint and TEST build passed. The unchanged backend uses its earlier successful TypeScript gate; the full suite was not rerun after this hardening.
- Lint: zero errors, 11 existing warnings.
- The SDK is a separate lazy chunk: 169.18 kB minified / 54.52 kB gzip, loaded only after consent.
- Main chunk after privacy hardening: 779.09 kB minified / 237.89 kB gzip. The Vite 500 kB warning remains; this is not a completed bundle-size optimization.
- Reproducible command output is retained locally under `/tmp/hawaii-posthog/final/`; these artifacts are not committed or proof of provider ingestion.
- The final real-SDK browser recipe blocks all external WebSockets/HTTP and intercepts EU ingestion using a fake token. The same successful run injects private URL/referrer sentinels, verifies sanitized wire payloads and a minimal disk cache, and exercises refusal, re-acceptance, withdrawal, reload continuity and identity reset. DNT/GPC block SDK loading even with stored acceptance.
- Consent screenshots cover 390/768/1440 pixels in light/dark themes. Headless transport required a runtime-only bot-filter override; it does not change production configuration.
- The lifecycle also has unit coverage; the browser run does not prove real provider ingestion, authenticated admin behavior or a complete cross-device visual audit.

Still requires owner participation:

- EU project selection, public token configuration and real ingestion/dashboard verification.
- Data-processing agreement, retention and IP-policy review.
- Confirmed Romania shipping tariff, actual enabled payment methods and fiscal settings.
- Legitimate TEST Clerk admin session for the full internal visual audit.
- Any TEST/production publish, provider activation or real/sandbox financial operation.
