# Project Standards

## Scope

These rules apply to all contributions in this repository.

## Non-Negotiables

- **Follow `.windsurfrules`**.
- **TypeScript strict mode** for all new code.
- **React functional components** with arrow functions.
- **Tailwind CSS** with a mobile-first approach (default → `md:` → `lg:`).
- **Semantic HTML** for accessibility.

## Hard Constraints

- Do not modify `public/investim-logo.svg`.
- Do not change `package.json` versions without explicit approval.

## File Naming Conventions

- **Components**: `PascalCase.tsx`
- **Hooks**: `useCase.ts`
- **Types**: `camelCase.types.ts`
- **Utils**: `camelCase.utils.ts`

## Component Structure

- Imports grouped:
  - React/external first
  - Internal second
- Types/interfaces at the top
- Props interface named with `Props` suffix

## Responsive + Accessibility Checklist

- Mobile layout works first
- `md:` and `lg:` adjustments only when necessary
- Keyboard navigation works (especially for menus/forms)
- Images have `alt`
- Buttons have accessible names

## Performance Defaults

- Memoize expensive computations
- Minimize re-renders
- Lazy-load heavy components when appropriate
- Avoid unnecessary large dependencies
