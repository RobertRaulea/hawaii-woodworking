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
