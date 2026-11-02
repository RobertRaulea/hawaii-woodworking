# Testing & Validation

Use Node 22 and the installed dependencies. Choose checks that cover the change; distinguish local automated evidence from real browser and external-service verification.

## Commands

| Check | Command |
| --- | --- |
| Unit/backend regression suite | `npm run test:unit` |
| React Testing Library interactions | `npm run test:ui` |
| Both suites | `npm test` |
| Frontend and UI-test strict types | `./node_modules/.bin/tsc -p tsconfig.app.json --noEmit` |
| Backend and shared strict types | `./node_modules/.bin/tsc -p convex/tsconfig.json --noEmit` |
| TypeScript configuration regression | `node --test tests/typescript-config.test.mjs` |
| ESLint | `npm run lint` |
| Optimized TEST build | `npm run build:test` |
| Local environment contract | `npm run check:env` |

`npm run build` and `./node_modules/.bin/vite build` invoke the same Vite build configuration. `vite.config.ts` generates search files in `closeBundle`: TEST emits a deny-all robots file and empty sitemap without a catalog query; production queries its configured Convex catalog. The direct Vite command is not a separate offline-production workaround. `npm run build:production` requires matching, approved production configuration; do not switch credentials merely to pass a check.

## Focused Runs

Backend/unit tests use `node:test`, the repository TypeScript loader, and experimental module mocks where needed:

```bash
node --experimental-test-module-mocks --import ./tests/register.mjs --test tests/authorization-backend.test.mjs tests/pos-backend.test.mjs
```

UI tests also need the jsdom setup:

```bash
node --experimental-test-module-mocks --import ./tests/register.mjs --import ./tests/ui/setup.mjs --test tests/ui/StaffAccess.test.tsx tests/ui/PointOfSale.test.tsx
```

Replace the test paths with the files relevant to the change. Keep the loader/setup flags; the UI suite is not Vitest/Jest and does not start a Vite test server. TypeScript transpilation in the test loader is not a typecheck.

## Test Selection and Assertions

- Components: use React Testing Library to test interactions, loading/empty/error/disabled states, keyboard behavior, and accessible labels. Prefer role/label queries and async helpers for data-driven updates.
- Staff access changes: cover anonymous/customer denial, the affected staff roles, backend response redaction, and fair-assignment scope as applicable.
- Stock/payment/lifecycle changes: cover insufficient/invalid stock, replay without duplicate writes, uncertain request recovery, paid-order claims, and the affected operation state transitions.
- Use existing fixture and UI mocking conventions. Do not remove stock, security, or money assertions to make a refactor pass.
- Changes to aliases or TypeScript project boundaries need the config regression test; keep alias resolution aligned across Vite, app TypeScript, and `tests/typescript-loader.mjs`.
- For documentation-only changes, check linked paths, script names, and consistency with source. A full application suite/build is not required just because a Markdown file changed.

## Verification Limits

- Backend tests use `tests/helpers/convexFixture.mjs`, a transactional in-memory double. `tests/e2e-integration.test.mjs` exercises functions across modules using that fixture; it is not a live Convex/browser E2E run and does not prove real OCC behavior.
- UI tests use jsdom and mocked layout/browser APIs. Native dialog, `matchMedia`, and observer stubs do not prove real focus trapping, responsive layout, or touch behavior.
- For changed user-facing layouts, inspect the relevant pages at mobile, tablet, and desktop widths; check light/dark themes where affected. Authenticated staff views require the appropriate Clerk roles and fair assignments.
- Stripe/Clerk/Oblio/Resend delivery, CAPTCHA, and genuine webhook behavior require separately authorized integration/manual checks. Never create real payments, invoices, emails, or shipments as an incidental smoke test.
- Vite serves frontend code only; starting it does not publish Convex changes. Backend sync and TEST publishing alter a shared remote environment: follow [the environment runbook](../environments.md) only when approved.
- Report the checks actually executed, failures/blockers, and unverified surfaces. Do not copy historical pass counts or deployment claims as current proof.
