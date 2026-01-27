# Prompting Guidelines

## Goal

Write prompts that are unambiguous, testable, and grounded in existing code so changes are small, safe, and consistent with project standards.

## Core Prompt Structure

Use this template when asking an agent to implement work:

```text
Task: [short title]

Context:
- What is broken / missing
- Where (file paths)
- Expected behavior

Constraints:
- Follow .windsurfrules
- TypeScript strict mode (no any)
- Mobile-first Tailwind (default → md: → lg:)
- Semantic HTML + accessibility

Acceptance criteria:
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

Files to read first:
- path/to/file1
- path/to/file2

Testing:
- Run: npm run build
- Run: npm run lint
- Add/update tests: [paths]
```

## High-Quality Prompt Patterns

### Pattern: New Feature (with acceptance criteria)

```text
Feature: Product detail page

User story:
As a shopper, I want to view product details so that I can decide to buy.

Acceptance criteria:
- [ ] Shows product name, price, description
- [ ] Responsive layout (mobile/tablet/desktop)
- [ ] Add to cart integrates with CartContext

Files to reference:
- src/hooks/useProducts.ts
- src/context/CartContext.tsx
```

### Pattern: Refactor (with constraints + guardrails)

```text
Refactor: Checkout page

Problem:
Checkout.tsx is too large.

Constraints:
- Keep existing public behavior
- No changes to API contracts
- Preserve types

Deliverables:
- Extract components:
  - CheckoutSummary.tsx
  - CheckoutButton.tsx
- Add tests for interactions
```

### Pattern: Debugging (repro steps + artifacts)

```text
Bug: Product images not displaying

Steps:
1. Go to /product/:id
2. Expected: images render
3. Actual: placeholders only

Artifacts:
- Console output: [paste]
- Network tab: [paste]

Relevant files:
- src/pages/ProductDetail/ProductDetail.tsx
- src/hooks/useProducts.ts
```

## Context Management

### Provide file anchors
When possible, reference exact files and functions.

```text
Read these before coding:
- src/pages/Checkout/Checkout.tsx
- convex/checkout.ts
```

### Reduce ambiguity
If a requirement is subjective (design, UX copy), explicitly say:

```text
Ask me clarifying questions before you implement UI copy or layout decisions.
```

## Tooling Guidance

- Prefer **small, incremental changes**.
- Ask for **tests** when adding features or changing behavior.
- For unfamiliar library usage, request **Context7 MCP** research first.
