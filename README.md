# Hawaii Woodworking Project

A modern, responsive web application for a woodworking business, built with React, TypeScript, and Tailwind CSS.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```bash
cp .env.example .env
```

Then fill in your credentials:

**Convex Setup:**
1. Run `npx convex dev`
2. Copy your deployment URL
3. Update `VITE_CONVEX_URL` in `.env`

**Storage (Optional):**
If product images are stored outside Convex, set `VITE_PRODUCTS_STORAGE_URL` in `.env`
to your storage base URL (e.g. your existing Supabase storage bucket URL).

**Stripe Setup:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Copy your **Secret Key** (use test key `sk_test_...` for development)
3. Update `STRIPE_SECRET_KEY` in `.env`
4. ⚠️ **Never commit your live Stripe keys to Git**

### 3. Seed Stripe Products (Optional)

If you want to sync your Convex products with Stripe:

```bash
npm run stripe:seed
```

This creates Stripe products and prices for all items in your `products` table.

### 4. Start Development Server
```bash
npm run dev
```

### 5. Build for Production
```bash
npm run build
```

## 🛠 Tech Stack

- **Frontend Framework:** React with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Backend:** Convex (Database + Functions)
- **Storage:** External (optional via `VITE_PRODUCTS_STORAGE_URL`)
- **Payments:** Stripe
- **State Management:** React Context API
- **Routing:** React Router
- **Icons:** Lucide React Icons
- **Code Quality:** ESLint, Prettier

## 📁 Project Structure

```
project/
├── src/
│   ├── components/
│   │   ├── Header/
│   │   │   └── Header.tsx       # Navigation and mobile menu
│   │   ├── Hero/
│   │   │   └── Hero.tsx        # Hero section with stats
│   │   ├── Services/
│   │   │   └── Services.tsx    # Service offerings display
│   │   ├── Products/
│   │   │   └── FeaturedProducts.tsx  # Product showcase
│   │   ├── Layout/
│   │   │   └── Layout.tsx      # Layout wrapper for Header and Footer
│   │   └── Footer/
│   │       └── Footer.tsx      # Site footer with newsletter
│   ├── assets/
│   │   └── hawaii-logo.svg     # Site logo
│   └── styles/
│       └── index.css           # Global styles and Tailwind
├── public/                     # Static assets
└── tests/                     # Test files
```

## 🎯 Components Overview

### Header Component
- Responsive navigation with mobile hamburger menu
- Logo centered on all screen sizes
- Shopping cart with item count
- Mobile-first design with smooth transitions

### Hero Component
- Full-screen hero section with background image
- Call-to-action buttons
- Statistics display (experience, projects, clients)
- Overlay with proper contrast for text readability

### Services Component
- Grid layout for service offerings
- Icon-based service cards
- Hover effects and shadows
- Responsive grid system

### FeaturedProducts Component
- Product grid with image cards
- Hover effects for quick view
- Price and add to cart functionality
- Responsive image handling

### Footer Component
- Four-column layout
- Newsletter subscription form
- Quick links and company information
- Social media integration ready

### Layout Component
- Wraps Header and Footer for consistent layout
- Uses React Router's Outlet for nested routing

### Products Page
- Displays a list of products with filtering options
- Responsive design with product details

## 📝 Coding Standards

### File Naming Conventions
- Components: `PascalCase.tsx`
- Types: `camelCase.types.ts`
- Utils: `camelCase.utils.ts`
- Hooks: `useCase.ts`

### Component Structure
```typescript
import React from 'react'
// External imports
// Internal imports

interface ComponentProps {
  // Props definition
}

export const Component: React.FC<ComponentProps> = () => {
  return (
    // JSX
  )
}
```

### Responsive Design
Mobile-first approach using Tailwind breakpoints:
- Default: Mobile (<768px)
- md: Tablet (≥768px)
- lg: Desktop (≥1024px)

## 🔍 Quality Assurance

### Testing Requirements
- Component testing with React Testing Library
- User interaction testing
- Responsive behavior testing

### Performance Guidelines
- Memoize expensive computations
- Implement lazy loading for heavy components
- Optimize images and assets
- Minimize unnecessary re-renders

## 🚀 Deployment

Build the application for production:
```bash
npm run build
```

## 🔎 Production: Products not showing (Convex) — Investigation Log

This section documents the exact steps and findings from our investigation into why products do not appear on the live/prod site.

### What we checked (step-by-step)

- **Frontend Convex configuration**
  - Located `src/main.tsx`.
  - Found Convex client initialization:
    - `new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)`
  - Conclusion:
    - The live site will only show products if **production** has the correct `VITE_CONVEX_URL` set at build/runtime.

- **Product query path (client)**
  - Located `src/hooks/useProducts.ts`.
  - Found that product listing uses:
    - `useQuery(api.products.getAll)`
  - Conclusion:
    - If `api.products.getAll` returns an empty array in production, the UI will show no products.

- **Product query path (server / Convex)**
  - Located `convex/products.ts`.
  - Found `getAll` implementation:
    - `ctx.db.query("products").collect()`
    - Optionally resolves `imageUrls` from `imageStorageIds` using `ctx.storage.getUrl`.
  - Conclusion:
    - There is no filtering or auth gate in `getAll`. If prod is empty, it strongly indicates the **prod `products` table has no rows** or the live site points at the wrong deployment.

- **Schema verification**
  - Located `convex/schema.ts`.
  - Found `products` table fields:
    - `name`, `price`, optional `images`, optional `imageStorageIds`, optional `category`, optional `description`, optional Stripe IDs.

- **Seeding path**
  - Located `scripts/seedConvex.ts`.
  - Found it reads `process.env.VITE_CONVEX_URL` and if missing/placeholder, falls back to:
    - `http://127.0.0.1:3210`
  - Conclusion:
    - If you run `npm run convex:seed` without a valid `VITE_CONVEX_URL`, you may be seeding **local/dev**, not production.

- **Vercel configuration**
  - Located `vercel.json`.
  - Found only a SPA rewrite to `/index.html`.
  - Conclusion:
    - Vercel is not configuring env vars here; production env vars must be set in Vercel project settings.

- **Attempted to inspect `.env`**
  - The repo contains `.env` and `.env.example`.
  - `.env` is **gitignored**, and tooling access to `.env` is blocked in this environment.
  - Conclusion:
    - We could not directly verify your `VITE_CONVEX_URL` value from the `.env` file through automated inspection.

- **Attempted to inspect Convex deployments programmatically**
  - Convex tooling reported:
    - `No CONVEX_DEPLOYMENT set, run \`npx convex dev\` to configure a Convex project`
  - We did not find `convex.json` or a `.convex/` directory in the repo during this pass.
  - Conclusion:
    - Your local environment likely hasn’t been configured for Convex in this workspace context (or the config directory is absent), so we couldn’t automatically compare dev vs prod deployments/tables.

### Most likely root causes

- **Production `VITE_CONVEX_URL` is missing or incorrect** on Vercel.
- **Your production Convex deployment has no seeded/migrated `products` data**, even if dev does.
- **Seeding/migration ran against local/dev** due to `VITE_CONVEX_URL` being unset/placeholder at the time.

### What to do next (do these in order)

- **1) Confirm your production build uses the correct Convex URL**
  - In Vercel:
    - Go to **Project Settings → Environment Variables**.
    - Ensure **Production** has `VITE_CONVEX_URL` set to your **prod** deployment URL (from the Convex dashboard).
  - Redeploy after setting/changing env vars.

- **2) Confirm the prod database actually has products**
  - Open your Convex dashboard for the **production** deployment.
  - Check the `products` table row count.
  - If it’s empty, you need to seed or migrate data into prod.

- **3) Seed products into prod intentionally**
  - Set `VITE_CONVEX_URL` to the **prod** Convex URL in your terminal environment (or in a temporary `.env` locally).
  - Run:
    - `npm run convex:seed`
  - Note:
    - Use `--force` only if you explicitly want to delete existing products and reinsert.

- **4) (If applicable) Run migration to prod intentionally**
  - If you migrated from Supabase, ensure the migration script targets the **prod** Convex URL and is run explicitly for prod.

- **5) Make local Convex tooling aware of your project**
  - Run `npx convex dev` once to configure the project locally.
  - This should create the local Convex config needed to target the correct deployment(s).

### Info needed to finish verification

- Paste (or confirm) the **production** value of `VITE_CONVEX_URL` (the URL itself is usually safe to share).
- Confirm whether you seeded/migrated products into production, or only into dev.

## 🤝 Contributing

1. Follow conventional commits
2. Ensure all tests pass
3. Follow the established code style
4. Document any new features

## 📄 License

[MIT License](LICENSE)

## 🔜 Upcoming Features

- State management implementation
- Form validation for newsletter
- Loading states for images
- Proper routing setup
- Accessibility improvements
- CI/CD pipeline setup
