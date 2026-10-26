# Frontend Guidelines (React + Tailwind)

## Conventions

- Use React functional components with arrow functions.
- Use React Router for navigation.
- Use lucide-react for icons.
- Use React Hook Form for forms.
- Use the shadcn/ui primitives in `src/components/ui/` (Button, Input, Label,
  Card, Badge, Alert, Dialog, Sheet, DropdownMenu, Checkbox, Slider,
  Accordion, Table, Command, sonner) instead of hand-rolled UI; `cn()` lives
  in `src/utils/cn.utils.ts`. The migration tracker with the intentional
  native exceptions (PaymentDialog `<dialog>`, `ImageCarousel`, complex
  content card-buttons, file/hidden inputs, simple filter selects) is in
  `docs/shadcn-migration.md`.
- Dark mode is class-based (`darkMode: 'class'`, toggled via `useTheme` +
  `ThemeToggle`, persisted in `localStorage`). Dark tokens live under `.dark`
  in `src/index.css`. When styling literals (`bg-white`, `text-stone-*`,
  `border-stone-*`, light tint surfaces), pair them with a `dark:` variant —
  the convention map: `bg-white→stone-900`, `bg-stone-50→stone-800`,
  `bg-stone-100→stone-800`, page backgrounds→`stone-950`, `text-stone-900→50`,
  `700→300`, `600/500→400`, `400→500`, `border-stone-200→800`, light tint
  surfaces→`*-950/40-60` with `*-300/400` text. Elements on images/overlays
  stay unchanged.

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
