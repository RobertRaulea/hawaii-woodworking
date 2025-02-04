# Hawaii Woodworking Project

A modern, responsive web application for a woodworking business, built with React, TypeScript, and Tailwind CSS.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## 🛠 Tech Stack

- **Frontend Framework:** React with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **State Management:** React Context API / Zustand
- **Routing:** React Router
- **Forms:** React Hook Form
- **Icons:** Lucide React Icons
- **Testing:** React Testing Library
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
