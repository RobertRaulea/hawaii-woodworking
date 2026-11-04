# Hawaii Woodworking Store — Agent Instructions

Romanian woodworking storefront and operational backoffice: online orders, fair POS, inventory, transfers, fulfillment, and reports. Sold in Romania only, in RON; the company is a non-VAT payer.

**Current mission: reach a sellable MVP and launch.** The owner wants to sell. Prefer the smallest change that removes a launch blocker. Do not add features, abstractions, or rewrites that are not needed to sell safely. Label anything else "not now" and move on. Launch status and blockers: [ecommerce MVP checklist](docs/agent-instructions/ecommerce-mvp.md).

## Workflow with Robert (read first, applies to every task)

Robert writes in Romanian, informally, often dictated, with typos. Answer him in Romanian. Code, commits, docs, and identifiers stay in English (exception: the workflow guide itself is in Romanian). Details and examples: [workflow guide](docs/agent-instructions/workflow.md).

1. **Load the `caveman` skill before starting any work.** Chat stays terse and in Romanian. Anything persisted (code, docs, commits, questions to Robert) uses full, plain sentences.
2. **Read `docs/decisions.md`** (project memory of settled decisions) before planning. Do not re-ask or contradict a recorded decision; if the task conflicts with one, say so.
3. **Show the plan first, in simple Romanian,** before editing anything. Explain every new or complex term in a short glossary line. Say what you will change, what you will not touch, and how you will verify.
4. **Ask with the ask tool, never guess.** Ask the relevant questions that give you correct context. Offer lettered options, mark your recommended option "(Recomand)", and keep options short. Business, legal, fiscal, shipping, price, and company values are never invented: ask, or list them as blockers.
5. **Execute, do not delegate back.** Do the work yourself. Hand Robert only steps that need his own dashboard access, as a numbered list with exact clicks, then stop. Never automate the IDE GUI.
6. **One topic per conversation.** If Robert switches to a different task, feature, or topic, recommend starting a new conversation with fresh context, and wait for his choice.
7. **Record decisions.** When Robert settles an important decision (business rule, scope cut, provider choice, tradeoff), propose a `docs/decisions.md` entry with the ask tool and write it only after he agrees.
8. **Suggest skills.** If a skill would do the job better, recommend a search with `find-skills` (skills.sh) and let Robert decide. Install nothing without his approval.
9. **"status ?" means:** a short Done / Not done / Blocked list, exact, with no narrative.
10. **Stop when told** ("oprește-te", "fără deploy"). Do not continue into adjacent work.

## Commands

Use Node 22 and npm. Pick checks that cover the change; see [testing](docs/agent-instructions/testing.md).

- `npm run dev` — frontend only; does not publish Convex functions. After adding or changing a Convex function, confirm it exists on the connected deployment before saying it works.
- `npm run check:env` — validate local environment configuration.
- `npm run lint` — ESLint.
- `npm test` — unit/backend regressions and React Testing Library.
- `./node_modules/.bin/tsc -p tsconfig.app.json --noEmit` — frontend/UI-test types.
- `./node_modules/.bin/tsc -p convex/tsconfig.json --noEmit` — backend/shared types.
- `npm run build:test` — optimized TEST bundle; also regenerates `dist/<route>/index.html`, `sitemap.xml`, `robots.txt` (`scripts/generate-sitemap.ts`, `scripts/prerender.ts`).

## Stack and entry points

React 18 + strict TypeScript + Vite + Tailwind/shadcn + React Router; Clerk auth, Convex backend, Stripe Checkout, Resend email, Oblio invoicing, PostHog (EU) analytics, Vercel hosting. Follow `.windsurfrules`; do not change dependency versions without explicit approval.

Entry points: `src/main.tsx` (providers), `src/App.tsx` (routes), `convex/schema.ts` (data), `convex/lib/permissions.ts` (access). Current code defines existing behavior; if instructions conflict with code or the request, flag the conflict instead of silently choosing.

## Hard rules (never without Robert's explicit approval in this conversation)

- **No remote or irreversible action:** no deploy, `test:sync`, `test:seed`, `test:publish`, Convex publish, push, provider or payment activation, production change, or data deletion. "Commit" means a local commit only. Local development shares the TEST backend; see [environments](docs/environments.md). Confirm the environment before any remote operation.
- **Never put secrets in chat, files, logs, or commits.** Check key prefixes only. Robert enters secrets in dashboards himself.
- **Never mix TEST and production.** Do not "switch mode" by editing `.env` files or labels. Never copy orders, customers, product IDs, or storage IDs across environments.
- **Do not weaken the analytics consent gate.** All PostHog work goes through `src/utils/analytics.utils.ts`; never import `posthog-js` directly or track before consent; honor DNT/GPC.
- **Do not rewrite legal text** in `src/pages/Legal/*` or checkout consent strings. Do not re-add SOL/ODR links (repealed; a test asserts their absence). Company facts live only in `shared/seo/seo.utils.ts` (`BUSINESS`).

## Money, stock, and orders (easy to break)

- Payment confirmation, stock allocation, and fulfillment are separate stages. A duplicate Stripe delivery must not repeat deductions or reschedule post-payment automation (`orders.markOrderPaid`, `postPaymentScheduledAt`).
- Reuse the original `requestId` to retry an uncertain payment, stock, transfer, POS, or order action. Never invent a new one for the same operation; never ask the customer to pay again for an uncertain paid attempt.
- Stock: nonnegative balances; every change writes a `stockMovements` row with `balanceAfter`; never edit stock through product forms or create another stock pool. `needs_review` orders must not ship; `shipped`/`delivered` orders cannot be cancelled.
- Cancel is not refund. Cancelling restocks once and sets `refundStatus: "manual_required"`; the Stripe refund is manual. Never mark money as refunded from order state, and never auto-retry an Oblio invoice (duplicate invoices).
- Internal access uses `admin`, `seller`, `atelier` through the shared permission matrix. Enforce permissions and fair scope in the backend as well as route guards. Roles come only from the Clerk JWT; never from client-supplied metadata or `staffDirectory`.
- Production payment is blocked in code (`convex/checkout.ts`, `src/pages/Checkout/Checkout.tsx`) until the shipping tariff exists. `CHECKOUT_ENABLED=true` alone does not enable sales. Do not bypass this silently; it is a launch-checklist item.
- TEST intentionally disables post-payment email and invoices (`convex/postPayment.ts`). Do not treat that as a bug and do not trigger real payments, invoices, emails, or shipments as a smoke test.
- Do not run `convex/maintenance.ts` mutations or legacy seed/migration scripts (`--force`) against production.

## Code and UI rules

- Reuse existing UI primitives, hooks, and business workflows before building new ones. No unrelated rewrites; do not rebuild code that already works.
- Strict TypeScript, no `any` without justification. Mobile-first Tailwind. Semantic HTML and accessible names. Light and dark themes both work. Storefront translations preserved. Prices render as `toFixed(2) RON`.
- Every action that changes something gives visible feedback and leaves a visible result (status, notification). Test the second action in a flow (second partial receive, retry), not only the first.
- Do not edit generated files under `convex/_generated/`.
- Robert edits files between turns. Re-read a file before editing it; preserve his changes and untracked files.
- If the request could mean "refactor" or "visible redesign", confirm the visible outcome first.

## Definition of done

1. Verify the original symptom is gone, not just that the code changed. Show evidence: command output, screenshot, or the exact check.
2. Run the checks that cover the change (lint, both `tsc` configs, focused tests; `build:test` for application changes).
3. For UI changes, check mobile, tablet, desktop, and dark mode in the running app. If you could not, say so explicitly.
4. Report what ran, what failed, and what was NOT verified. Do not copy historical pass counts as proof.
5. When delegating to subagents, do not edit the same files in parallel.

## Read for your task

- [Workflow with Robert: style, prompts, mistakes](docs/agent-instructions/workflow.md)
- [Decisions memory](docs/decisions.md)
- [Ecommerce MVP checklist and launch blockers](docs/agent-instructions/ecommerce-mvp.md)
- [Prompting and instruction-writing guide](docs/agent-instructions/prompting.md)
- [Project conventions](docs/agent-instructions/project-standards.md)
- [Frontend, UI, localization, assets](docs/agent-instructions/frontend.md)
- [Convex, authentication, backend boundaries](docs/agent-instructions/convex.md)
- [Backoffice module map and business invariants](docs/backoffice-context.md) — dated notes are historical.
- [Testing commands and limits](docs/agent-instructions/testing.md)
- [TEST/production environments and release runbook](docs/environments.md)
- [Order automation setup (email, Oblio)](docs/order-automation-setup.md)
- [Git workflow](docs/agent-instructions/git-workflow.md)
