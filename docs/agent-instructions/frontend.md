# Frontend Guidelines (React + Tailwind)

## Conventions

- Use React functional components with arrow functions.
- Use React Router for navigation.
- Use HeroIcons for icons.
- Use React Hook Form for forms.

## UI Implementation Checklist

- **States**:
  - Loading
  - Empty
  - Error
  - Disabled
- **Responsiveness**:
  - Mobile-first classes by default
  - Use `md:` and `lg:` for enhancements
- **Accessibility**:
  - Prefer semantic elements (`main`, `section`, `nav`, `header`, `footer`)
  - Ensure interactive elements are reachable and usable via keyboard

## Data Fetching

- Prefer Convex hooks (`useQuery`, `useMutation`, `useAction`) and generated `api`.
- Keep data-fetching logic in hooks when it improves reuse.

## Patterns

- Extract repeated UI blocks into components.
- Keep pages focused on composing components and handling routing.

## Avoid

- Adding `any` to “make TypeScript happy”.
- Large re-renders by computing derived values inline without memoization.
- Putting business logic in presentational components.
