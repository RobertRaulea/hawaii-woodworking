# TEST and Production

One codebase, separate data and payment environments. The current rollout changes
TEST only. Production data, configuration, and payment activation are untouched.

## Environment Map

| Service | TEST / development | Production (future activation) |
| --- | --- | --- |
| Storefront | https://hawaii-woodworking-test-robertrauleas-projects.vercel.app | https://www.hawaiiproducts.ro |
| Vercel project | `hawaii-woodworking-test` | `magazin_online_hawaii_products` |
| Convex | `exuberant-fox-228` | `upbeat-lyrebird-218` |
| Clerk | `choice-fowl-16.clerk.accounts.dev`, Development | Production instance must be verified before launch |
| Stripe | Hawaii sandbox `acct_1RYni5I8gZB3b1Rz`, test keys | Live business account, not activated by this rollout |
| Fiscal invoices / order emails | Disabled | Configure and validate before launch |

The Vercel dashboard calls the stable deployment of the TEST project "Production".
That is a hosting release label, NOT Stripe Live mode. Its `VITE_APP_ENV` remains
`test`, with only test provider bindings.

Use the team-scoped URL in the table as the canonical TEST checkout origin.
Other Vercel aliases are not automatically trusted checkout return origins.

The Stripe MCP business account and the existing isolated sandbox have different
account IDs. The sandbox key used by Convex has been checked directly through
Stripe: its balance has `livemode=false`, and its enabled webhook points at
`https://exuberant-fox-228.convex.site/stripe-webhook`.

## Local Development

Keep `.env.local` selecting `dev:exuberant-fox-228`. Start with `.env.example` if
setting up a new checkout, and supply the Development Clerk publishable key.
Never commit `.env.local` or secret keys.

```bash
npm run check:env
npm run dev
```

After changing backend functions, publish them explicitly:

```bash
npm run test:sync
```

Local development and public testers share this test backend and data. Do not
run an uncontrolled backend watcher while testers expect a stable release. A
fully independent, permanent staging backend would require a separate Convex
project and is a future option, not silently created infrastructure.

## Test Catalog

```bash
npm run test:seed
```

This runs an INTERNAL, test-deployment-only seed. Thirty demo products have stable
keys, 100 initial units each, and 480-pixel representative photos from Unsplash.
Photo source and license URLs are recorded in `demoAssets`. Photos are copied to
TEST Convex storage, not hotlinked by the UI.

Repeating the seed inserts nothing and does not replenish purchased stock or
overwrite edits. Existing products and order references are preserved. There are
34 products after the first seed: the 4 previous products plus 30 demo products.
Do not use the legacy seed scripts or their destructive `--force` mode.

## Tester Instructions

1. Open the TEST storefront. The amber TEST notice must be visible.
2. Add demo products to the cart and enter shipping details.
3. Optionally create an account and verify the emailed code. Existing users can
   sign in. Normal customers never receive admin access automatically.
4. Use Stripe test card `4242 4242 4242 4242`, expiry `12/34`, and CVC `123`.
5. No real money is charged, no fiscal invoice is issued, and no parcel is sent.

Clerk creates the login identity. Convex creates/links the customer using the
authenticated identity at checkout. Stripe creates/reuses a billing Customer on
the first checkout. Users do not need three separate accounts.

The newly verified Clerk session must be authenticated by Convex before payment
is enabled. Passwords are not persisted with shipping details.

Admins use `/admin/orders` and `/admin/fulfillment` to exercise preparation,
packing, and shipping statuses. This is a simulation: do not purchase shipping
labels or perform actual dispatches. Existing test admin roles remain managed
by Clerk; new customers are not promoted.

## Release TEST

```bash
npm test
npm run lint
npm run build:test
npm run test:publish
```

`test:publish` pins the Vercel team AND test project, syncs the approved development
backend, and deploys to that TEST project's stable URL. It requires a Vercel CLI
login for the team (or a securely supplied `VERCEL_TOKEN`). The CLI is fetched by
`npx` if absent. It never chooses a project based on a previous production link.
No production deployment key is needed.

Frontend builds validate explicit environment, Convex URL, Clerk key mode/issuer,
and site origin. TEST builds have static and React `noindex` metadata, a deny-all
robots file, and an empty sitemap. They never query the production database.

To re-check the existing sandbox and repair non-secret TEST backend settings:

```bash
npm run test:configure
```

That command checks the exact sandbox account and existing enabled webhook first.
It does not print keys or rotate a webhook signing secret.

## Future Production Launch

This has NOT been performed.

1. Inventory and back up the existing production data. Obtain explicit approval
   for any deletion, or decide on a new empty production project.
2. Verify Clerk Production, domain/DNS, JWT audience `convex`, verified-email
   claims, and explicit staff roles. Update the provider binding only if verified
   production identifiers differ from the documented contract.
3. Configure `APP_ENV=production`, production site/issuer, a LIVE Stripe key,
   separate live webhook and signing secret. Keep `CHECKOUT_ENABLED=false`
   until the explicit launch decision.
4. Copy `.env.production.example` to ignored `.env.production.local` for an
   authorized production build, or set equivalent variables on production hosting.
5. Promote the tested CODE with production settings. Never copy test orders,
   customer IDs, product IDs, or storage IDs across environments.
6. Upload the real catalog, validate fulfillment and operational integrations,
   then explicitly approve enabling real purchases.

`npm run build:production` intentionally fails with the current local TEST
credentials. A release must never "switch mode" by merely changing a label.

## Validation Limits

Automated tests cover configuration mismatches, signed webhook modes, no test
invoice/email side effects, seed idempotency, and signup/authentication gating.
They do not replace real email delivery, browser CAPTCHA, native focus/viewport
checks, or a tester completing hosted Stripe Checkout and observing its genuine
webhook delivery.

Convex currently reports Free plan usage above its limits. Review the team usage
dashboard before inviting a large tester group; this work does not upgrade billing.

## Verified Rollout (2026-10-27)

- TEST frontend deployment `dpl_7smCvgybmruDoiK5UGauriaCdr6d` reached READY.
- The live public catalog renders 34 products, including 30 demo products with images.
- Browser checks at 390, 768, and 1440 pixels showed no horizontal overflow and no
  application JavaScript errors.
- A real hosted Stripe TEST Checkout accepted the 4242 test card and returned to
  the TEST thank-you page. Stripe reported `livemode=false`, `payment_status=paid`.
- Its genuine webhook marked order `jh74q710dxgdhzp25ycj46w5wn8h28e3` paid with
  inventory applied; demo product `demo-v1-6-1` stock decreased from 100 to 99.
- Unit/backend and RTL suites pass: 156 + 104 tests. Frontend/backend strict
  TypeScript checks and the TEST production-optimized build pass.
- Automated public Clerk signup reached the expected Cloudflare human-verification
  challenge. It was not bypassed or disabled. Actual email verification, JWT
  claims, and authenticated checkout still need a human signup check or a Clerk
  testing token from an authorized Clerk connection; no Clerk MCP is available
  in this session. Mocked signup/error/auth-readiness tests pass.
- Production data and configuration were not modified.
