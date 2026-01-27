# Supabase to Convex Migration Plan

**Project**: Hawaii Woodworking Store  
**Date**: January 27, 2026  
**Status**: Planning Phase

## Executive Summary

This document outlines the phased migration plan to fully replace Supabase with Convex as the backend for the Hawaii Woodworking e-commerce application. The frontend and core product/checkout flows already use Convex; this migration focuses on eliminating remaining Supabase dependencies in build scripts and completing the data migration.

## Current State Analysis

### ✅ Already on Convex
- **Frontend**: `src/main.tsx` uses `ConvexProvider` + `ConvexReactClient`
- **Product queries**: `src/hooks/useProducts.ts` calls `api.products.getAll`
- **Stripe checkout**: `src/pages/Checkout/Checkout.tsx` calls `api.checkout.createCheckoutSession`
- **Backend schema**: `convex/schema.ts` defines products table with all necessary fields
- **Backend functions**: `convex/products.ts` and `convex/checkout.ts` provide queries/mutations/actions

### ⚠️ Remaining Supabase Dependencies
1. **`dist-scripts/scripts/generate-sitemap.js`**
   - Reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   - Queries Supabase `products` table for product IDs
   - Used in `prebuild` step to generate sitemap.xml

2. **`dist-scripts/scripts/seedStripe.js`**
   - Reads products from Supabase
   - Creates Stripe products/prices
   - Writes `stripe_product_id` and `stripe_price_id` back to Supabase

3. **Environment variables**
   - Legacy `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` still referenced in scripts

## Target Architecture

### Single Source of Truth: Convex
- All product data (name, price, images, category, description, Stripe IDs) stored in Convex `products` table
- Server-side scripts use `ConvexHttpClient` to interact with Convex backend
- No Supabase dependencies in any part of the application

### Data Layer
```
┌─────────────────┐
│   React App     │
│  (src/)         │
└────────┬────────┘
         │
         │ ConvexReactClient
         │ (useQuery, useMutation, useAction)
         │
┌────────▼────────┐
│  Convex Backend │
│  (convex/)      │
│  - products     │
│  - checkout     │
└────────┬────────┘
         │
         │ Stripe API
         │
┌────────▼────────┐
│  Stripe         │
│  (payments)     │
└─────────────────┘
```

### Build Scripts
```
┌─────────────────┐
│  Node Scripts   │
│  (dist-scripts/)│
└────────┬────────┘
         │
         │ ConvexHttpClient
         │ (query, mutation)
         │
┌────────▼────────┐
│  Convex Backend │
│  (convex/)      │
└─────────────────┘
```

## Phased Migration Plan

### Phase 0: Baseline & Inventory ⏱️ 1 hour
**Goal**: Confirm scope and prepare for migration

- [x] Verify no Supabase auth usage in application
- [x] Verify no Supabase storage usage beyond image URLs
- [x] Confirm Convex schema covers all Supabase fields
- [x] Document current product count and sample data
- [ ] Create backup of Supabase data (export to JSON/CSV)

**Notes (local dev)**:
- Node runtime updated to a supported version (Node 22) so Convex can deploy `"use node"` actions.
- Local Convex dev deployment started successfully.
- Baseline: `products` count = 0 (local dev deployment)

**Deliverables**:
- Data export file from Supabase
- Schema comparison checklist

---

### Phase 1: Replace Build Scripts ⏱️ 3-4 hours
**Goal**: Eliminate Supabase from build/maintenance scripts

#### Task 1.1: Update Sitemap Generation
**File**: `dist-scripts/scripts/generate-sitemap.js`

**Changes**:
1. Replace Supabase client with Convex HTTP client:
   ```javascript
   import { ConvexHttpClient } from "convex/browser";
   import { api } from "../../convex/_generated/api.js";
   
   const convexUrl = process.env.VITE_CONVEX_URL;
   const client = new ConvexHttpClient(convexUrl);
   ```

2. Replace Supabase query with Convex query:
   ```javascript
   // Old: await supabase.from('products').select('id')
   // New:
   const products = await client.query(api.products.getAll);
   const productIds = products.map(p => ({ id: p._id }));
   ```

3. Remove `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` references

**Testing**:
- Run `npm run prebuild` locally
- Verify sitemap.xml is generated with correct product URLs
- Verify no Supabase errors

#### Task 1.2: Update Stripe Seeding Script
**File**: `dist-scripts/scripts/seedStripe.js`

**Changes**:
1. Replace Supabase client with Convex HTTP client
2. Read products from Convex:
   ```javascript
   const products = await convexClient.query(api.products.getAll);
   ```

3. Write Stripe IDs back via Convex mutation:
   ```javascript
   await convexClient.mutation(api.products.setStripeIds, {
     id: product._id,
     stripeProductId: stripeProduct.id,
     stripePriceId: stripePrice.id
   });
   ```

**Testing**:
- Run script against test Convex deployment
- Verify Stripe products/prices are created
- Verify IDs are persisted in Convex

**Deliverables**:
- Updated `generate-sitemap.js` (Convex-based)
- Updated `seedStripe.js` (Convex-based)
- Test results documentation

---

### Phase 2: Seed Test Data in Convex (No Supabase Export) ⏱️ 15-30 min
**Goal**: Seed a set of editable test products directly into Convex (you can modify them later)

#### Task 2.1: Seed Convex Products
**File**: `scripts/seedConvex.ts`

**Runbook**:
1. Ensure `npx convex dev` is running
2. Ensure `.env` contains `VITE_CONVEX_URL` (local should be `http://127.0.0.1:3210`)
3. If you want to use local images, set:
   - `VITE_PRODUCTS_STORAGE_URL=/assets/ProductsAssets`
   and ensure the images exist in `public/assets/ProductsAssets/`.
   - Copy them from the repo assets folder:
     ```bash
     mkdir -p public/assets/ProductsAssets
     cp -R assets/ProductsAssets/* public/assets/ProductsAssets/
     ```
4. Seed products:
   ```bash
   npm run convex:seed -- --force
   ```

#### Task 2.2: Validation
- [ ] Confirm products appear on `/products`
- [ ] Open a product detail page `/product/:id`
- [ ] Add to cart and verify cart totals
- [ ] Checkout flow behavior:
  - Expected to fail with “Missing Stripe price ID” until Stripe IDs are seeded

---

### Phase 2b (Optional): Supabase → Convex Data Migration ⏱️ 2-3 hours
**Goal**: Migrate all product data from Supabase to Convex (optional)

#### Task 2b.1: Export Supabase Data
1. Export products table to JSON:
   ```bash
   # Use Supabase dashboard or CLI
   # Save to: data/supabase-products-export.json
   ```

2. Validate export:
   - Check record count
   - Verify all fields present (name, price, images, category, description, stripe_product_id, stripe_price_id)
   - Check for null/missing values

#### Task 2b.2: Transform Data for Convex
Create migration script: `scripts/migrateSupabaseToConvex.ts`

**Transformations needed**:
- Supabase `id` (UUID) → Convex `_id` (auto-generated)
- Ensure `images` is array or undefined (not null)
- Ensure `category`, `description` are string or undefined (not null)
- Preserve `stripe_product_id` and `stripe_price_id` if present

#### Task 2b.3: Import to Convex
1. Use existing `api.products.seedProducts` mutation
2. Run with `force: true` to clear existing test data
3. Import all products from Supabase export

**Implementation**: `scripts/migrateSupabaseToConvex.ts` (in this repo)

**Runbook**:
1. Export Supabase `products` to JSON (array of records)
2. Save it locally (recommended): `data/supabase-products-export.json` (path is configurable)
3. Ensure `.env` contains `VITE_CONVEX_URL` pointing to the target Convex deployment
4. Run the migration:
   ```bash
   npm run convex:migrate -- data/supabase-products-export.json --force
   ```
   - Omit `--force` to avoid overwriting an existing `products` table.
   - If you omit the file argument, the script defaults to `data/supabase-products-export.json`.

#### Task 2b.4: Validation
- [ ] Compare product counts (Supabase vs Convex)
- [ ] Spot-check 10 random products (all fields match)
- [ ] Verify Stripe IDs are preserved
- [ ] Test frontend product listing
- [ ] Test checkout flow with migrated data

**Suggested spot-check fields**:
- `name`, `price`
- `images` is either an array of strings or missing (not null)
- `category`, `description` are string or missing (not null)
- `stripe_product_id`, `stripe_price_id` preserved for products that had them

**Deliverables**:
- Migration script
- Data export file
- Validation report

---

### Phase 3: Storage Strategy ⏱️ 1-2 hours (or deferred)
**Goal**: Decide on image hosting strategy

#### Option A: Keep External Image Hosting (Recommended for quick migration)
**Pros**:
- Minimal changes required
- No data migration needed
- Works with existing `VITE_PRODUCTS_STORAGE_URL`

**Cons**:
- Still depends on external service (if using Supabase Storage)

**Action items**:
- [ ] If images are in Supabase Storage, migrate to another CDN/storage (Cloudinary, AWS S3, Vercel Blob, etc.)
- [ ] Update `VITE_PRODUCTS_STORAGE_URL` to new base URL
- [ ] Update image paths in Convex if needed

#### Option B: Move to Convex File Storage (Future enhancement)
**Pros**:
- Single backend for all data
- Simplified infrastructure

**Cons**:
- Requires backend changes (file upload mutations)
- Requires frontend changes (upload UI)
- Larger migration effort

**Decision**: Defer to Phase 3b (post-launch) unless Supabase Storage is actively used

---

### Phase 4: Authentication (Conditional) ⏱️ 4-8 hours
**Goal**: Replace Supabase Auth if currently in use

#### Current State Assessment
- [ ] Is Supabase Auth currently used? (admin panel, user accounts, etc.)
- [ ] What auth features are needed? (login, signup, password reset, OAuth, etc.)

#### If Auth is Needed:
**Recommended approach**: Use Convex with Auth0 or Clerk

**Implementation**:
1. Choose provider (Auth0 recommended for simplicity)
2. Set up provider account and application
3. Install provider SDK:
   ```bash
   npm install @auth0/auth0-react
   ```

4. Update `src/main.tsx` to use `ConvexProviderWithAuth0`:
   ```typescript
   import { Auth0Provider } from "@auth0/auth0-react";
   import { ConvexProviderWithAuth0 } from "convex/react-auth0";
   
   <Auth0Provider
     domain={import.meta.env.VITE_AUTH0_DOMAIN}
     clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
     authorizationParams={{
       redirect_uri: window.location.origin,
     }}
     useRefreshTokens={true}
     cacheLocation="localstorage"
   >
     <ConvexProviderWithAuth0 client={convex}>
       <App />
     </ConvexProviderWithAuth0>
   </Auth0Provider>
   ```

5. Add route protection using `useConvexAuth()`:
   ```typescript
   import { useConvexAuth } from "convex/react";
   
   const { isAuthenticated, isLoading } = useConvexAuth();
   ```

6. Update Convex functions to check authentication:
   ```typescript
   export const adminMutation = mutation({
     handler: async (ctx, args) => {
       const identity = await ctx.auth.getUserIdentity();
       if (!identity) throw new Error("Unauthorized");
       // ... mutation logic
     }
   });
   ```

**Deliverables**:
- Auth provider setup documentation
- Updated frontend with auth integration
- Protected routes implementation
- Backend authorization checks

---

### Phase 5: Decommission Supabase ⏱️ 1 hour
**Goal**: Complete removal of all Supabase dependencies

#### Task 5.1: Remove Dependencies
1. Remove `@supabase/supabase-js` from package.json:
   ```bash
   npm uninstall @supabase/supabase-js
   ```

2. Remove Supabase environment variables:
   - Remove from `.env` (local)
   - Remove from hosting provider (Vercel/Netlify)
   - Remove from CI/CD pipelines

3. Search for any remaining Supabase references:
   ```bash
   grep -r "supabase" --exclude-dir=node_modules --exclude-dir=.git
   grep -r "SUPABASE" --exclude-dir=node_modules --exclude-dir=.git
   ```

#### Task 5.2: Update Documentation
- [ ] Update README.md with Convex-only setup instructions
- [ ] Update `.env.example` (already done - verify)
- [ ] Document new deployment process

#### Task 5.3: Verify Build Pipeline
- [ ] Test `npm run prebuild` (sitemap generation)
- [ ] Test `npm run build` (production build)
- [ ] Test deployment to staging environment
- [ ] Verify no Supabase errors in logs

**Deliverables**:
- Clean codebase with no Supabase references
- Updated documentation
- Successful production deployment

---

## Risk Mitigation

### Data Loss Prevention
- **Backup**: Keep Supabase export file in version control (`data/supabase-backup.json`)
- **Validation**: Run comprehensive data validation after migration
- **Rollback plan**: Keep Supabase project active for 30 days post-migration

### Downtime Minimization
- **Staging first**: Test entire migration on staging environment
- **Off-peak deployment**: Schedule production migration during low-traffic hours
- **Quick rollback**: Keep old scripts available with `_legacy` suffix

### Testing Strategy
- **Unit tests**: Test individual script functions
- **Integration tests**: Test full build pipeline
- **E2E tests**: Test frontend product listing and checkout
- **Manual QA**: Spot-check critical user flows

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 0: Baseline | 1 hour | None |
| Phase 1: Scripts | 3-4 hours | Phase 0 |
| Phase 2: Data Migration | 2-3 hours | Phase 1 |
| Phase 3: Storage | 1-2 hours | Phase 2 |
| Phase 4: Auth (if needed) | 4-8 hours | Phase 2 |
| Phase 5: Decommission | 1 hour | All previous |
| **Total (no auth)** | **8-11 hours** | |
| **Total (with auth)** | **12-19 hours** | |

## Success Criteria

- [ ] All build scripts run without Supabase dependencies
- [ ] All product data migrated and validated
- [ ] Frontend product listing works correctly
- [ ] Checkout flow completes successfully
- [ ] Sitemap generation works in build pipeline
- [ ] No Supabase references in codebase
- [ ] Production deployment successful
- [ ] Zero customer-facing issues

## Open Questions

1. **Auth**: Is Supabase Auth currently used anywhere in the application?
2. **Data**: Is `products` the only Supabase table to migrate?
3. **Images**: Are product images stored in Supabase Storage?
4. **Timeline**: What is the target completion date for this migration?
5. **Staging**: Is there a staging environment available for testing?

## Next Steps

1. Review this plan with stakeholders
2. Answer open questions
3. Set up staging environment (if not exists)
4. Begin Phase 0: Baseline & Inventory
5. Schedule migration window for production deployment

## References

- [Convex React Documentation](https://docs.convex.dev/client/react)
- [Convex Node.js Client](https://docs.convex.dev/client/javascript/node)
- [Convex Authentication](https://docs.convex.dev/auth)
- [Current Convex Schema](`@/Users/robert.raulea/Personal Workspace/Hawaii Store/hawaii-woodworking/convex/schema.ts`)
- [Current Products Functions](`@/Users/robert.raulea/Personal Workspace/Hawaii Store/hawaii-woodworking/convex/products.ts`)
