# Convex Guidelines

Read this before changing `convex/`, shared environment contracts, or frontend/backend interfaces.

## Structure and Function Boundaries

- `convex/schema.ts` defines the data model and indexes; use generated IDs/types/API references from `convex/_generated/`, never edit generated output by hand.
- Keep database reads in queries and transactional writes in mutations. Use actions for external integrations; existing Stripe/Oblio/Resend integrations that require Node APIs use dedicated `'use node'` modules.
- Validate public arguments with `v` validators and enforce domain constraints server-side. Use the surrounding `ConvexError` patterns for actionable operational errors.
- Keep payment internals, maintenance operations, and demo seed internals internal; do not expose them as public functions to simplify a script or test.
- Reuse `lib/inventory.utils.ts`, `lib/orders.utils.ts`, `lib/pos.utils.ts`, `lib/products.utils.ts`, and `lib/reports.utils.ts` instead of duplicating stock, lifecycle, eligibility, or money calculations.
- Server-side scripts that need application reads use `ConvexHttpClient` and generated references, following existing scripts. Inspect maintenance/legacy seed scripts before running them; script presence is not authorization to execute it.

## Authentication and Authorization

- Clerk issues the Convex JWT; `convex/auth.config.ts` uses `CLERK_JWT_ISSUER_DOMAIN` and the `convex` application audience.
- `lib/auth.ts` reads the exact role claim, falling back to `publicMetadata.role`. Accepted internal roles are `admin`, `seller`, `atelier`; unknown/missing roles grant no staff permissions.
- `lib/permissions.ts` is the shared pure permission matrix and role landing-page map. Add new permissions there, not in parallel frontend role lists.
- Use `requirePermission(ctx, permission)` for operational endpoints and `requireAdmin(ctx)` for explicitly admin-only endpoints. Protect sensitive queries as well as writes/actions; a hidden menu is not authorization.
- Apply `requireFairAccess` / `authorizedFairIds` to fair-scoped operations. Sellers do not gain access to every fair just because they can sell.
- `staff.me` supplies frontend access through `useStaffAccess`. `staffDirectory` is a display/lookup directory; editing it does not grant a Clerk role. Never derive authority from its stored role or client arguments.
- Customer ownership comes from the authenticated subject and verified identity/email, never a client-provided `clerkUserId`. Preserve guest/customer linking protections and per-customer order visibility.
- Preserve role-specific response redaction: fulfillment staff must not receive admin financial/payment data merely because the UI hides it.

## Stock, Payments, and Recovery

- Schema and business invariants are detailed in [backoffice context](../backoffice-context.md). Stock changes must preserve transactional balance updates, audit records, receipts/events, and replay behavior.
- Do not bypass paid-order claims, outstanding POS protections, transfer lifecycle checks, or stock-count snapshot validation.
- Keep payment confirmation independent from stock allocation and fulfillment. Preserve `pending`, `applied`, `needs_review`, and `released` inventory states, including legacy handling.
- Webhooks must verify signatures and environment mode. Repeated payment deliveries must not deduct stock or schedule post-payment automation twice.
- Cancellation/restocking does not confirm a Stripe refund. Keep the existing `manual_required` distinction; do not mark money refunded based only on order state.

## Environment and Publication

- `shared/environment.ts` defines frontend/provider contracts; `convex/lib/environment.ts` validates backend, payment mode, checkout activation, and return origins.
- Frontend bindings include `VITE_APP_ENV`, `VITE_CONVEX_URL`, `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_SITE_URL`; backend bindings include `APP_ENV`, `CONVEX_CLOUD_URL`, `CLERK_JWT_ISSUER_DOMAIN`, and `SITE_URL`.
- Stripe actions additionally require matching `STRIPE_SECRET_KEY`; webhook verification uses `STRIPE_WEBHOOK_SECRET`; checkout requires `CHECKOUT_ENABLED=true`. Do not weaken validation to make mixed environments work.
- TEST post-payment processing sends real Resend emails and simulates the fiscal invoice without calling Oblio or persisting invoice data. Production integrations require their own verified configuration; local source code is not proof they are configured or active.
- `npm run dev` runs Vite only. When an approved task needs backend publication, use the guarded `npm run test:sync` workflow from [the environment runbook](../environments.md), not an uncontrolled watcher on the shared TEST backend.
- The installed Convex CLI uses saved account authentication with its default `.env.local` loading; do not blindly substitute `--env-file` when relying on that login.
- No sync/deploy/seed or production/provider changes as an incidental test. Confirm the target and obtain approval; never print secret values.
