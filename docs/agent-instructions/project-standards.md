# Project Standards

Read this for implementation conventions. `.windsurfrules` remains an existing project rule source; report contradictions rather than weakening a constraint to make a change pass.

## Scope and Constraints

- Use strict TypeScript for new code; do not introduce `any` without a specific justification.
- Do not change `package.json` dependency versions without explicit approval.
- Preserve existing branding and assets unless the task explicitly asks to change them. The old `public/investim-logo.svg` reference is obsolete; that path is not present in this repository.
- Keep changes focused on the requested behavior. Reuse the current catalog, stock, order, and permission models instead of creating parallel systems.
- Do not edit generated files under `convex/_generated/` manually.

## File and Component Conventions

- React components are functional arrow components; component files use `PascalCase.tsx`.
- Hooks use `useCase.ts`; types use `camelCase.types.ts`; utilities use `camelCase.utils.ts`.
- Group React/external imports before internal imports; put types/interfaces near the top and suffix props interfaces with `Props`.
- Existing shadcn primitives in `src/components/ui/` use lowercase filenames. Preserve their established paths instead of renaming them to match application component conventions.
- Keep the root `tsconfig.json` solution-only. Frontend options/aliases belong in `tsconfig.app.json`; backend/shared settings belong in `convex/tsconfig.json`.

## UI and Performance

- Use Tailwind mobile-first: default layout, then `md:` and `lg:` enhancements where needed.
- Preserve semantic HTML, accessible names, keyboard operation, and image alternatives.
- Use the shared UI primitives and existing hooks before building replacements; see [frontend guidance](frontend.md).
- Memoize expensive computations when warranted, lazy-load heavy pages/components, and use the image compression/thumbnail helpers where appropriate. Do not add blanket memoization or new dependencies without a demonstrated need.
- Follow the surrounding formatting and ESLint configuration. Prettier is not configured in this repository; do not invent a command or install a formatter as an unrelated change.

## Verification

- Add or update behavior-focused tests for changed functionality.
- Use [the testing guide](testing.md) to select relevant checks and state any checks not performed.
- Local fixtures/jsdom do not establish live Convex concurrency, external service behavior, or real responsive layout correctness.
