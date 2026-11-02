# Hawaii Woodworking Store

Romanian woodworking storefront and operational backoffice for online orders, fair POS, inventory, transfers, fulfillment, customers, staff, and reports.

## Stack

- React 18, strict TypeScript, Vite
- Tailwind CSS, shadcn/Radix primitives, React Router, React Hook Form, lucide-react
- Clerk authentication
- Convex backend/database
- Stripe Checkout and webhooks
- Oblio invoices and Resend email in the production automation path
- `react-i18next` storefront translations: Romanian, English, German
- Vercel hosting

## Local development

Use Node 22 and npm.

```bash
npm install
cp .env.example .env.local
```

Keep the TEST values from `.env.local`, provide the TEST Clerk publishable key, then run:

```bash
npm run check:env
npm run dev
```

Local development uses the shared TEST Convex deployment. `npm run dev` only starts Vite and does not publish backend functions. Publishing to TEST is an explicit remote operation; see `docs/environments.md` before running `npm run test:sync`, seeding, or changing provider settings.

## Common commands

| Purpose | Command |
| --- | --- |
| Environment validation | `npm run check:env` |
| Unit/backend tests | `npm run test:unit` |
| UI tests | `npm run test:ui` |
| All tests | `npm test` |
| Lint | `npm run lint` |
| Frontend typecheck | `./node_modules/.bin/tsc -p tsconfig.app.json --noEmit` |
| Backend/shared typecheck | `./node_modules/.bin/tsc -p convex/tsconfig.json --noEmit` |
| Optimized TEST build | `npm run build:test` |
| Guarded TEST backend sync | `npm run test:sync` |

## Repository map

- `src/` — storefront and backoffice React code
- `src/components/ui/` — shared shadcn/Radix primitives
- `convex/` — schema, permissions, backend functions, integrations
- `shared/` — environment contracts shared with frontend tooling
- `tests/` — Node test fixtures and React Testing Library suites
- `docs/agent-instructions/` — task-specific implementation and validation guidance
- `docs/environments.md` — TEST/production runbook

## Operational notes

Payment confirmation, inventory allocation, fulfillment, refunds, invoices, and fulfillment notifications are separate workflows. Preserve request IDs, user-scoped checkpoints, stock audit trails, and environment separation. Never place backend secrets in `VITE_*` variables or commit `.env.local`.

For detailed agent guidance, start with `AGENTS.md` and the linked documents in `docs/agent-instructions/`.
