# Test and Production Separation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Provide a shareable test store with 30 demo products and simulated payments, while keeping the future real-money store isolated and free of demo data.

**Architecture:** Keep one React UI and two explicitly bound application environments. Each environment owns its Convex database/storage, Clerk instance, Stripe mode, webhook secret, hosting configuration, and operational settings. Promote tested code, never test databases or provider IDs.

**Tech Stack:** React, strict TypeScript, Vite, Tailwind, React Router, Convex, Clerk, Stripe Checkout, Vercel.

---

## Status and Approval Boundary

- The user approved TEST implementation, configuration, seeding, and publishing after the read-only audit.
- TEST backend configuration and functions have been published; 30 demo products have been inserted without deleting existing records.
- Frontend publishing and final live verification are tracked in `docs/environments.md` and the session handoff.
- Production settings/data are outside this implementation's write scope.
- Do not delete existing data, run forced seeds, enable real payments, or publish to production without specific approval.
- Do not alter the existing untracked Stripe live-sync plan.
- Execute directly in this session unless the user explicitly requests agents.

## Verified Audit Findings

1. Local `.env` targets `https://upbeat-lyrebird-218.convex.cloud` (production), but its Clerk publishable key and Stripe secret key are test keys.
2. `.env.local` selects `dev:exuberant-fox-228` and `https://exuberant-fox-228.convex.cloud`.
3. Vite and maintenance scripts do not share one environment-loading contract. Several scripts load `.env` directly; changing one URL does not safely switch the whole application.
4. The development database has exactly 4 products, 3 categories, 5 customers, and 13 orders at audit time.
5. Production schema inspection shows existing data, including customers and inventory-related tables. Production is not an empty new database; exact production counts were not available through the current restricted MCP connection.
6. Development Convex has variable names for Clerk issuer, Stripe key, Stripe webhook secret, and Resend key. Key modes and webhook deliveries in the deployed backend remain unverified; existence is not validation.
7. Development Convex trusts `https://choice-fowl-16.clerk.accounts.dev`, matching the issuer configured locally.
8. Stripe test/live MCP connections report the same business account. Subsequent direct credential verification confirmed Convex dev uses the separate Hawaii sandbox `acct_1RYni5I8gZB3b1Rz`, with `livemode: false` and an enabled webhook to the development deployment. Preserve this working sandbox rather than replacing it with the MCP business account's test data.
9. Checkout already creates/reuses Convex customers and Stripe Customers automatically. It builds Stripe line items dynamically from server-side product snapshots; a separate Stripe catalog seed is not needed for checkout.
10. Registration with email verification already exists in the shipping UI. It needs real interaction coverage and confirmation that Convex authentication is ready after Clerk activation.
11. Checkout currently permits production return origins even in development and falls back to the production website. A new test URL is not in the current development `ALLOWED_ORIGINS` variable list.
12. Webhook signatures are verified, but `event.livemode` is not checked against an explicit application environment.
13. Post-payment automation calls Oblio and Resend without an explicit test/production boundary. Missing Oblio credentials currently abort that action. Neither real invoicing nor unrestricted transactional emails should be activated for testing.
14. Existing product seeds default stock to zero; forced seeding deletes products and can break historical references. Do not use them to prepare the tester catalog.
15. Production setup documentation recommends manually changing `.env` and seeding production; replace this unsafe workflow.

## Access Gaps

- No Clerk MCP server is exposed in this session. Clerk signup policies, JWT templates, and production instance settings need a connected integration or a guided dashboard step. Never request secret values in chat.
- Vercel lists two candidate projects: `hawaii-store-5qgj` and `magazin_online_hawaii_products`. Their repository/domain bindings are not verified.
- Reading either Vercel project's configuration returns 403 for team `team_mzFZr8dDj1tOT6UbQrO6vftw`. The user must approve the generated team-consent link, then the original read request can be retried.
- Production Convex MCP intentionally restricts access. Do not bypass the restriction to inspect credentials or customer data.
- Stripe MCP operation discovery did not expose webhook listing. Check endpoints through an authorized dashboard or a separately approved supported API/CLI path.

## Proposed Environment Contract

| Concern | Test / Development | Production |
| --- | --- | --- |
| Public URL | Stable test URL, preferably `test.hawaiiproducts.ro`, subject to domain access | Existing production domain, after binding verification |
| Convex initial target | `exuberant-fox-228` | `upbeat-lyrebird-218`, retained until data inventory and cleanup approval |
| Clerk | Development instance, `pk_test_...` | Separate Production instance, `pk_live_...` |
| Stripe | Test credentials and test-only webhook | Live credentials and separate live webhook |
| Products | 30 identifiable demo products, in addition to preserved existing data | No demo products; real catalog added only when approved |
| Payments | Simulated only | Disabled until explicit launch approval |
| Invoices / notifications | No fiscal invoices; notifications off or allowlisted test recipients | Explicitly configured production integrations |
| Search engines | `noindex` and test robots policy | Production SEO |
| Release | Proposed `develop` branch, test project only | `main`, explicit approved promotion |

Use a separate Vercel test project linked to the same repository, after confirming which existing project owns production. This avoids relying on a moving preview URL or copying production credentials into every preview.

The existing Convex development deployment is sufficient to establish the requested two-environment setup. Local development and public testers would share its data and backend releases. Document that limitation and publish only deliberate test releases while testers are active.

If tester stability must be independent of ongoing backend development, obtain approval for a dedicated Convex staging project instead. Convex recommends a separate project for persistent staging; its deployment may be labelled "Production" by Convex while remaining application TEST with Clerk Development and Stripe Test. Convex deployment labels do not determine Stripe payment mode. Do not introduce this extra infrastructure silently.

## Task 1: Establish One Environment Contract

**Files:** Modify `.env.example`, `src/main.tsx`, `src/vite-env.d.ts`; create `src/utils/environment.utils.ts`, `convex/lib/environment.ts`, `scripts/checkEnvironment.ts`, `tests/environment-config.test.mjs`.

1. Write failing cases for missing mode, test/live key mismatch, wrong backend URL, unknown environment, and production checkout disabled.
2. Define `VITE_APP_ENV=test|production`, `VITE_CONVEX_URL`, `VITE_CLERK_PUBLISHABLE_KEY`, and `VITE_SITE_URL` for frontend builds.
3. Define backend `APP_ENV`, `SITE_URL`, `ALLOWED_ORIGINS`, `CHECKOUT_ENABLED`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `CLERK_JWT_ISSUER_DOMAIN`.
4. Implement strict fail-closed validation. Do not infer payment safety from Vite's `MODE` or `NODE_ENV`; production-optimized test builds still use test services.
5. Keep provider secret keys backend-only. Diagnostics print environment labels and public endpoints, never credentials.
6. Consolidate ignored local configuration so Vite, scripts, and Convex tooling do not select different targets. Respect the installed Convex CLI's documented account-token / `.env.local` behavior.
7. Document explicit test/prod commands without changing package versions. Validate target binding before any seed or deployment.

## Task 2: Isolate Checkout and Payment Confirmation

**Files:** Modify `convex/checkout.ts`, `convex/stripeVerify.ts`, `convex/stripeWebhook.ts`; create `tests/environment-payments.test.mjs`.

1. Test that wrong-mode keys fail before any Stripe call, customer mutation, or order creation.
2. Test that production checkout remains disabled until launch authorization.
3. Replace the unconditional production return fallback with environment-specific origins; reject unexpected origins and disallow localhost in production.
4. Validate verified Stripe `event.livemode` against `APP_ENV` before marking any order paid.
5. Keep webhook signature verification, server-authoritative prices, and existing stock/payment idempotency behavior.
6. Configure separate test and live webhook destinations at their corresponding `https://<deployment>.convex.site/stripe-webhook` URLs, only after write approval.
7. Confirm the initial test rollout uses supported immediate card payments. Do not enable asynchronous payment methods without their additional confirmation-event handling.

## Task 3: Verify Self-Service Customer Registration

**Files:** Modify `src/pages/Shipping/Shipping.tsx`, `src/hooks/useCustomerProfile.ts`, `convex/customers.ts` only where regression tests show a defect; create `tests/ui/CustomerSignup.test.tsx`.

1. Confirm Clerk allows public signup and the current UI's email/password/name fields and email verification strategy.
2. Verify each Clerk instance has the `convex` JWT template with audience `convex`, correct issuer, required verified-email claims, and existing admin role contract.
3. Test signup, email verification, session activation, Convex authentication readiness, customer persistence, sign-out/sign-in, and duplicate-email errors.
4. Wait for Convex authentication before persisting an authenticated profile; do not silently continue with an unintentionally unlinked guest profile.
5. Keep normal users as customers; admin access is assigned explicitly and separately in each environment.
6. Create Clerk identity on signup, Convex customer when shipping details are saved, and Stripe Customer at first checkout. Stripe Customers are billing records, not independent login accounts; do not create Stripe login credentials or ask users to register three times.
7. If profile creation immediately on every Clerk signup is later required outside shipping, add an explicit minimal identity-profile design rather than inventing shipping addresses.

## Task 4: Make Operational Automation Safe in Test

**Files:** Modify `convex/postPayment.ts`; create `tests/post-payment-environment.test.mjs`.

1. Test that `APP_ENV=test` makes no real Oblio request and no unrestricted Resend call.
2. Disable fiscal invoicing for test orders; make test notifications disabled by default or restricted to an explicitly approved recipient list.
3. Keep payment confirmation, stock changes, and the preparation/packing workflow functional without invoice/email credentials.
4. Keep production invoice and notification failures observable; do not replace real production invoices with fabricated successful responses.

## Task 5: Add a Safe 30-Product Demo Catalog

**Files:** Create `convex/demoCatalog.ts`, `scripts/seedDemoCatalog.ts`, `scripts/fixtures/demoProducts.ts`, `tests/demo-catalog.test.mjs`; modify `convex/schema.ts` only if a stable demo identifier is needed.

1. Test rejection in production, unauthorized caller rejection, exactly 30 deterministic demo definitions, positive stock, and repeat-run idempotency.
2. Add an internal, explicitly targeted seed path; no anonymous public seeding and no destructive `force` mode.
3. Use stable demo identifiers, realistic RON prices, categories, descriptions, and enough online stock for repeated purchases.
4. Obtain approved reusable internet photos, download small variants (roughly 480-640 px), and record source/license information. Store copies in test Convex storage instead of relying on unstable hotlinks.
5. Bound image-fetch size/type/timeouts and make interrupted uploads retryable without duplicating products.
6. Preserve the current four products and all existing orders. If the user wants exactly 30 total visible products, request approval before archiving existing catalog entries.
7. Run the seed only after the target test deployment and write authorization are verified. Do not run the legacy `convex:seed` or `stripe:seed` workflows.

## Task 6: Publish a Clearly Labelled Test Store

**Files:** Modify `vercel.json`, `src/components/Layout/Layout.tsx`, `src/components/SEO/SEO.tsx`, `scripts/generate-sitemap.ts`, and the currently executed `dist-scripts/scripts/generate-sitemap.js`; create `src/components/EnvironmentBanner/EnvironmentBanner.tsx`, `tests/ui/EnvironmentBanner.test.tsx`.

1. Preserve the current UI; add only a compact test-only notice that payments are simulated.
2. Set test-only `noindex` metadata/headers and robots behavior. Avoid generating production sitemap URLs containing test product IDs.
3. Make sitemap generation use the same resolved backend and site URL as the actual build.
4. Keep demo images under existing Convex image origins, avoiding a broad CSP relaxation.
5. Bind the approved test URL to the test project and confirm deployment protection does not prevent invited testers from opening it.
6. Configure the test project with test-only frontend settings and a test-scoped backend deploy credential. Keep production credentials absent from test and preview contexts.
7. Deploy frontend and matching Convex functions as one deliberate release; confirm installed CLI options before choosing the build command.

## Task 7: Prepare Production Without Deleting Existing Data

**Files:** Replace unsafe instructions in `docs/convex-production-setup.md`; update `.env.example`; create `docs/environments.md`.

1. Verify the actual production Vercel project, domain, backend, Clerk instance, and Stripe mode when access is available.
2. Keep checkout disabled pending launch. Blocking only the UI is insufficient; enforce the backend setting too.
3. Inventory all existing business data and references; do not assume current records are disposable.
4. Propose a backup plus explicit table-by-table cleanup, or a new empty production project if preserving old data is preferable. Obtain specific approval before either infrastructure creation or deletion.
5. Interpret "empty production" as no demo/business records, while allowing necessary admin and configuration records.
6. Promote the tested commit with production configuration only. Never copy test users, orders, Stripe IDs, products, or storage IDs into production.

## Task 8: Validation and Tester Handoff

1. Run `npm run test:unit`, `npm run test:ui`, `./node_modules/.bin/tsc -p tsconfig.app.json --noEmit`, and `npm run lint`; report existing failures separately.
2. Run the environment validator and `npm run build` using the approved test configuration. Confirm sitemap prebuild does not query production.
3. Test real browser layouts at mobile, tablet, and desktop sizes; test signup, verification, login, catalog/filter/detail/cart, and checkout.
4. Complete an authorized Stripe TEST payment using `4242 4242 4242 4242`, future expiry (for example `12/34`), and CVC `123`; never use real card details for this test.
5. Confirm signed webhook delivery marks the order paid once, decrements stock once, and exposes it in preparation/packing/shipping screens.
6. Test declined payment, cancelled checkout, webhook replay, and a second logged-in order reusing the same customer mapping.
7. Confirm no new test business records appear in production, no fiscal invoice is issued, and no unrestricted production email is sent. Use authorized aggregate checks, not broad personal-data dumps.
8. Hand over the stable URL, test payment instructions, account instructions, admin workflow, release commands, and known shared-dev/test limitations.

## Acceptance Criteria

- Test URL loads the existing UI with a visible simulated-payments notice.
- Thirty demo products with small working images and purchasable stock exist only in the test database.
- Users can self-register, verify their email, and purchase without manual database or Stripe customer creation.
- Signed test payment confirmation drives the existing order-preparation workflow.
- Mixed environment settings fail closed; test checkout cannot redirect into production.
- Production receives no demo data or real-money activation from this work.
- The active environment is easy to inspect; promotion changes code/configuration, not database identity.

## Documentation Consulted

- https://docs.convex.dev/production/overview
- https://docs.convex.dev/production/hosting/vercel
- https://clerk.com/docs/guides/development/managing-environments
- https://docs.stripe.com/testing
