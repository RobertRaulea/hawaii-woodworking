# Hawaii Woodworking Store — Agent Instructions

Romanian woodworking storefront and operational backoffice: online orders, fair POS, inventory, transfers, fulfillment, and reports.

## Start Here

- Stack: React 18 + strict TypeScript + Vite + Tailwind/shadcn + React Router; Clerk auth, Convex backend, Stripe Checkout.
- Follow `.windsurfrules`; do not change dependency versions without explicit approval.
- Read the task-specific guide below before editing. Current code defines existing behavior; if instructions conflict with code or the requested behavior, flag the conflict instead of silently choosing a new contract.
- Entry points: `src/main.tsx` (providers), `src/App.tsx` (routes), `convex/schema.ts` (data), `convex/lib/permissions.ts` (access).

## Local Commands

Use Node 22 and npm. Run checks appropriate to the change; see the testing guide for focused commands and limitations.

- `npm run dev` — frontend only; does not publish Convex functions.
- `npm run check:env` — validate local environment configuration.
- `npm run build:test` — optimized TEST bundle; no production catalog query. The build also writes static HTML snapshots (`dist/<route>/index.html`), `sitemap.xml`, and `robots.txt` via `scripts/generate-sitemap.ts` + `scripts/prerender.ts`; refresh them by running a build.
- `npm run lint` — repository ESLint checks.
- `npm test` — unit/backend regressions and React Testing Library interactions.
- `./node_modules/.bin/tsc -p tsconfig.app.json --noEmit` — frontend/UI-test types.
- `./node_modules/.bin/tsc -p convex/tsconfig.json --noEmit` — backend/shared types.

## Critical Guardrails

- Confirm the environment before any remote operation. Local development shares the TEST backend; sync, seed, publish, production activation, and provider changes are not local validation. Follow the environment runbook and obtain approval for the operation.
- Internal access uses `admin`, `seller`, `atelier` and the shared permission matrix. Enforce backend permissions and fair scope as well as route guards; never grant access from client-supplied metadata or directory records.
- Preserve stock audit trails, nonnegative balances, paid-order claims, and in-transit quantities. Do not edit stock through product forms or invent another stock pool.
- Preserve idempotency and user-scoped checkpoints. Resolve uncertain payments/stock/transfers/order actions using their original `requestId`; never clear an uncertain paid attempt or ask for another payment.
- Payment confirmation, stock allocation, and fulfillment are separate. Duplicate Stripe deliveries must not repeat deductions or schedule post-payment automation again; unresolved `needs_review` orders must not ship.
- Reuse existing UI and business workflows. Preserve accessibility, mobile/tablet/desktop behavior, light/dark themes, and storefront translations; do not perform unrelated rewrites.

## Read for Your Task

- [Project conventions and constraints](docs/agent-instructions/project-standards.md)
- [Frontend, UI, localization, and assets](docs/agent-instructions/frontend.md)
- [Convex, authentication, and backend boundaries](docs/agent-instructions/convex.md)
- [Backoffice module map and business invariants](docs/backoffice-context.md) — dated audit/release notes are historical, not current deployment status.
- [Testing commands and verification limits](docs/agent-instructions/testing.md)
- [TEST/production environment and release runbook](docs/environments.md)
- [Git workflow](docs/agent-instructions/git-workflow.md)
