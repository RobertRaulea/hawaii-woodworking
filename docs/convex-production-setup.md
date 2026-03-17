# Convex Production Setup Guide

## Understanding Convex Deployments

Convex provides two deployment environments:
- **Development**: For local development and testing
- **Production**: For your live application

Each environment has its own:
- Database (separate tables and data)
- Environment variables
- Deployment URL

## Current Issue

Your production deployment doesn't have the `categories` table seeded with data, causing the error:
```
Error: [CONVEX Q(categories:getAll)] Server Error
```

## Solution: Deploy and Seed Production

### Step 1: Deploy to Production

1. **Push your schema to production:**
   ```bash
   npx convex deploy
   ```
   
   This command:
   - Pushes your schema (including the `categories` table) to production
   - Deploys all your Convex functions
   - Generates the production deployment URL

2. **Verify deployment:**
   - Go to [Convex Dashboard](https://dashboard.convex.dev)
   - Select your project
   - Click on "Production" deployment
   - Check that the `categories` table exists (it will be empty)

### Step 2: Seed Production Data

1. **Update your `.env` file to point to production:**
   ```bash
   # Temporarily change this line in .env
   VITE_CONVEX_URL=https://your-production-url.convex.cloud
   ```
   
   Get your production URL from the Convex dashboard under Production → Settings.

2. **Run the seed script:**
   ```bash
   npm run seed
   ```
   
   This will seed both categories and products to production.

3. **Restore your `.env` to development:**
   ```bash
   # Change back to your dev URL
   VITE_CONVEX_URL=https://your-dev-url.convex.cloud
   ```

### Step 3: Configure Production Environment Variables

Set these in the Convex Dashboard (Production → Settings → Environment Variables):

1. **CLERK_JWT_ISSUER_DOMAIN**
   - Value: Your Clerk issuer domain (e.g., `https://your-app.clerk.accounts.dev`)
   - Required for authentication

2. **STRIPE_SECRET_KEY** (if using Stripe)
   - Value: Your production Stripe secret key (`sk_live_...`)
   - ⚠️ Use live keys for production, test keys for development

## Switching Between Environments

### Method 1: Using Environment Variables (Recommended)

**For Development:**
```bash
# In .env
VITE_CONVEX_URL=https://your-dev-url.convex.cloud
```

**For Production:**
```bash
# In .env
VITE_CONVEX_URL=https://your-production-url.convex.cloud
```

### Method 2: Using Convex CLI

**Start development server:**
```bash
npx convex dev
```
This automatically uses your development deployment.

**Deploy to production:**
```bash
npx convex deploy
```
This pushes changes to production.

## Workflow Best Practices

### Daily Development
1. Use `npx convex dev` for local development
2. Test changes in development environment
3. Your `.env` should point to development URL

### Deploying to Production
1. Test thoroughly in development
2. Run `npx convex deploy` to push to production
3. Temporarily update `.env` to production URL
4. Run seed scripts if needed
5. Restore `.env` to development URL
6. Verify production at your live site

## Verifying Your Setup

### Check Development
```bash
# Make sure .env points to dev URL
npx convex dev
# Visit http://localhost:5173
```

### Check Production
```bash
# Update .env to production URL
npm run build
npm run preview
# Or deploy to Vercel/Netlify
```

## Common Commands

| Command | Purpose |
|---------|---------|
| `npx convex dev` | Start development with auto-sync |
| `npx convex deploy` | Deploy schema and functions to production |
| `npm run seed` | Seed data to current environment (based on .env) |
| `npm run seed -- --force` | Force re-seed (deletes existing data) |

## Troubleshooting

### "Server Error" in Production
- Ensure you've run `npx convex deploy`
- Check that tables are seeded with data
- Verify environment variables are set in Convex dashboard

### Seed Script Fails
- Ensure you're logged in as admin (Clerk authentication)
- Check that `VITE_CONVEX_URL` in `.env` points to correct environment
- Verify Convex is running (`npx convex dev` for development)

### Changes Not Appearing in Production
- Run `npx convex deploy` to push changes
- Clear browser cache
- Check Convex dashboard for deployment status

## Quick Fix for Your Current Issue

Run these commands in order:

```bash
# 1. Deploy schema to production
npx convex deploy

# 2. Update .env to production URL (get from Convex dashboard)
# Edit .env: VITE_CONVEX_URL=https://your-production-url.convex.cloud

# 3. Seed production data
npm run seed

# 4. Restore .env to development URL
# Edit .env: VITE_CONVEX_URL=https://your-dev-url.convex.cloud

# 5. Rebuild and deploy your frontend
npm run build
# Then deploy to Vercel/Netlify
```

Your production site should now work correctly!
