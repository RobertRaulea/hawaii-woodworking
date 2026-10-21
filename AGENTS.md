# Hawaii Woodworking Store — Agent Instructions

Use this as the **minimal** always-on guidance for AI coding assistants. For detailed rules, follow the linked docs (progressive disclosure).

## Quick Reference

- **Stack**: React + TypeScript (strict) + Vite + Tailwind + React Router + Convex
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Dev**: `npm run dev`

## Non-Negotiables (Applies to Every Task)

- Follow `.windsurfrules`.
- TypeScript strict mode (no `any` without strong justification).
- React functional components with arrow functions.
- Tailwind mobile-first styling (default → `md:` → `lg:`).
- Semantic HTML + accessibility.
- Do not change `package.json` versions without explicit approval.

## Detailed Instructions

- **Project standards**: `docs/agent-instructions/project-standards.md`
- **Prompting templates**: `docs/agent-instructions/prompting.md`
- **Frontend guidelines**: `docs/agent-instructions/frontend.md`
- **Convex guidelines**: `docs/agent-instructions/convex.md`
- **Testing & validation**: `docs/agent-instructions/testing.md`
- **Git workflow**: `docs/agent-instructions/git-workflow.md`

## Project Docs

- **Supabase → Convex migration**: `docs/supabase-to-convex-migration.md`

## Local Validation

- Unit/backend regression tests (Node 22, installed TypeScript): `npm run test:unit`
- React Testing Library interaction tests with jsdom: `npm run test:ui`; all tests: `npm test`. The UI runner uses Node 22's experimental module-mocking API, not a Vite test server.
- Strict frontend check: `./node_modules/.bin/tsc -p tsconfig.app.json --noEmit`
- TypeScript config regression tests: `node --test tests/typescript-config.test.mjs`. Keep the root `tsconfig.json` solution-only; frontend compiler options and aliases belong in `tsconfig.app.json`.
- Strict POS backend check: `./node_modules/.bin/tsc --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution bundler convex/pos.ts convex/schema.ts`
- Offline production bundling: `./node_modules/.bin/vite build`. `npm run build` also runs a sitemap prebuild that queries the configured Convex deployment.
- Development backend sync: `./node_modules/.bin/convex dev --once`; first verify that `.env.local` selects the intended development deployment. Vite alone does not publish new Convex functions.
- With Convex CLI 1.31.6, use default `.env.local` loading for account-token authentication. Its `--env-file` path skips the saved account login when no deploy key is provided.
- Backend tests use a transactional database double. React Testing Library tests exercise interactions in jsdom; legacy markup tests use server rendering. These do not replace Convex OCC integration tests or real browser viewport/native dialog focus testing.

## Fair Point Of Sale

- `/admin/pos` uses the existing admin-only access model, including discount authorization.
- Product `stock` is the online pool (the historical `workshop` audit location). Total stock is derived as online plus all `fairInventory` balances; there is no separate third workshop allocation.
- All POS money is integer bani. Card payments require approval on a separate bank terminal; fiscal documents and returns are separate workflows.
- Payment attempts are idempotent and recoverable locally and from `pos.openAttempts`. Do not clear an uncertain paid attempt or request another payment; verify/retry its original request ID.
- Fair creation and archival live at `/admin/fairs`; inventory and bidirectional transfers live at `/admin/inventory`. The POS does not contain inventory configuration.
- Archival returns remaining fair stock online atomically, after a confirmed quantity preview, and is blocked by unresolved POS payments.
- Inventory operations have durable `inventoryOperations` receipts and user-scoped local checkpoints. Never regenerate the request ID for an uncertain transfer/archive.
- Online payment confirmation is independent of inventory fulfillment: `inventoryStatus` is `pending`, `applied`, or `needs_review`. Paid orders needing review must be explicitly reconciled before shipping; repeated Stripe deliveries must not deduct stock or schedule post-payment automation again.
