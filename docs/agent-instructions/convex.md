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

## Auth (Clerk)

- **Provider**: Clerk (`@clerk/clerk-react` + `convex/react-clerk`).
- **Client**: `ClerkProvider` wraps `ConvexProviderWithClerk` in `main.tsx`.
- **JWT config**: `convex/auth.config.ts` reads `CLERK_JWT_ISSUER_DOMAIN` env var.
- **Admin gating**: Use `requireAdmin(ctx)` from `convex/lib/auth.ts` in any mutation/action that should be admin-only.
- **Role claim**: The admin role is set via Clerk `publicMetadata.role = "admin"` and exposed as a `role` claim in the Convex JWT template.
- **Frontend guard**: `<AdminRoute />` component checks `Authenticated` + `isAdmin` hook; redirects to `/admin/login` otherwise.

## Node Scripts

When writing build/maintenance scripts that need data:
- Prefer `ConvexHttpClient` (HTTP client) and generated `api`.

## Environment Variables

- `VITE_CONVEX_URL` must be set.
- `VITE_CLERK_PUBLISHABLE_KEY` must be set (Clerk publishable key).
- `STRIPE_SECRET_KEY` is required for Stripe actions (Convex dashboard).
- `CLERK_JWT_ISSUER_DOMAIN` must be set in the Convex dashboard.
