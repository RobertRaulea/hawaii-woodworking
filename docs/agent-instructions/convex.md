# Convex Guidelines

## Overview

This project uses Convex for backend data and server-side logic.

## Client Usage (React)

- Initialize `ConvexReactClient` with `VITE_CONVEX_URL`.
- Use `ConvexProvider` (or an auth-specific provider when configured).
- Use:
  - `useQuery(api.domain.fn, args)` for reads
  - `useMutation(api.domain.fn)` for writes
  - `useAction(api.domain.fn)` for server-side actions (e.g., Stripe)

## Server Functions

- **Schema**: `convex/schema.ts`
- **Generated API**: `convex/_generated/api` (do not edit)
- **Functions**:
  - `query` for reads
  - `mutation` for writes
  - `action` for Node runtime integrations (Stripe, external APIs)

## Validation and Errors

- Validate inputs using `v` validators.
- Throw descriptive errors for invalid inputs or missing resources.

## Auth (when enabled)

- Prefer provider-supported integration.
- Gate sensitive operations in Convex functions.
- Use `useConvexAuth()` on the client to protect routes.

## Node Scripts

When writing build/maintenance scripts that need data:
- Prefer `ConvexHttpClient` (HTTP client) and generated `api`.

## Environment Variables

- `VITE_CONVEX_URL` must be set.
- `STRIPE_SECRET_KEY` is required for Stripe actions.
