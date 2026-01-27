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
