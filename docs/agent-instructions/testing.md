# Testing & Validation

## What to Test

### Components (React Testing Library)

- User interactions
- Loading/empty/error states
- Responsive behavior (mobile default, then `md:`/`lg:`)

## Testing Principles

- Test behavior, not implementation details.
- Prefer queries by role/label text.
- Use async helpers (`findBy*`, `waitFor`) for data-driven UI.

## Pre-Commit Validation

Run these locally before merging:

```bash
npm run build
npm run lint
```

If you changed user-facing flows:

```bash
npm run dev
```

## When Adding Features

- Add tests for newly introduced behavior.
- Update existing tests if contracts change.
- Keep tests focused and readable.
