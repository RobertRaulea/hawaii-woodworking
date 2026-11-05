# Decisions Memory

Settled project decisions. Agents read this before planning and do not re-ask or contradict an entry. To add or change an entry, propose it to Robert with the ask tool and write it only after he agrees. Newest entries go at the bottom. Never record secrets here.

Entry format: `YYYY-MM-DD — Decision. Why. (Status: confirmed | to confirm | deferred)`

## Confirmed by Robert (2026-11-04)

- 2026-11-04 — Sell in Romania only, prices in RON. Why: shipping and fiscal setup exist only for RO. (Status: confirmed)
- 2026-11-04 — The company is a non-VAT payer; no VAT line on prices. Why: stated in the Terms and Conditions. Oblio and fiscal treatment still need an accountant check before launch. (Status: confirmed)
- 2026-11-04 — TEST and production are separate environments on purpose. TEST exists so testers can try the whole shop with prod-like (cloned) data before any real sale. The store must be thoroughly tested on TEST before production goes live. No remote action (deploy, publish, seed, activation) without explicit approval. (Status: confirmed)
- 2026-11-04 — Do not invent business values (shipping tariff, fiscal treatment, company data, payment methods). Ask, or list as a blocker. (Status: confirmed)
- 2026-11-04 — Agent skills (`.agents/skills/`, `.devin/skills/`, `.claude/skills/`, `skills-lock.json`) are committed so a colleague gets the same setup. The personal `.devin/config.local.json` is never committed. Supersedes the earlier "skills stay uncommitted" decision. (Status: confirmed)
- 2026-11-04 — Git hygiene: `main` is the only long-lived branch. Use short-lived branches and pull requests, delete them after merge, and keep no stale local branches or extra worktrees. (Status: confirmed)
- 2026-11-04 — A push to `main` auto-deploys to Vercel production (`magazin_online_hawaii_products`). Vercel preview builds fail by design because previews have no `VITE_APP_ENV`; this is not a bug. Never merge to `main` without Robert's approval. (Status: confirmed)
- 2026-11-04 — Launch blockers are handled in a separate conversation. See `docs/agent-instructions/ecommerce-mvp.md`. (Status: confirmed)
- 2026-11-04 — shadcn is not a dependency in `package.json`. Components are copied code in `src/components/ui/`; use the CLI via `npx shadcn@latest` only when needed. Do not overwrite existing components without approval (they carry POS, dark-mode, and Romanian-label customizations). (Status: confirmed)
- 2026-11-04 — Dependencies were updated to latest within current majors, plus vite 8. Stay on React 18, Tailwind 3, ESLint 9, TypeScript 5, and lucide-react 0.x until after launch; majors are a post-launch audit item. Never bypass `.npmrc` `min-release-age=7`. (Status: confirmed)
- 2026-11-04 — The shadcn refactor is done now, before launch, as an explicit exception to the "MVP only" rule. Why: Robert wants a cleaner base to keep building on. Scope approved: add variants to `ui/button.tsx` and `ui/badge.tsx` (existing variants stay untouched), add `NativeSelect`, `Field`, `Empty`, `Spinner`, `Tabs` and `Carousel` to `src/components/ui/`, and keep `@radix-ui/react-tabs` and `embla-carousel-react` as dependencies (pinned exact). Semantic colour tokens in `src/index.css` equal the exact Tailwind stone values used by the app. Supersedes the earlier "do not overwrite existing components without approval" only for these additions. (Status: confirmed)

## Deferred until launch (do not work on now)

- Analytics: PostHog EU opt-in reporting lives in the external PostHog dashboard, not in admin. The consent gate in code stays mandatory. Revisit only right before or during the production launch.
- SEO: existing SEO work stands; any further SEO or ad decisions wait until launch time.
