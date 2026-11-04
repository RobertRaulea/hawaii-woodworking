# Frontend Guidelines

Read this for changes under `src/`. Preserve the existing UI and workflows unless a redesign is explicitly requested.

## Entry Points and Data

- `src/main.tsx` validates frontend environment bindings and mounts `ClerkProvider` → `ConvexProviderWithClerk` → `LanguageProvider`.
- `src/App.tsx` owns React Router routes, lazy-loaded pages, cart/shipping providers, maintenance guard, environment notice, SEO provider, and toast host. Keep new navigation in this routing model.
- Public pages use `Layout`; staff pages use permission-gated `AdminRoute` and `AdminLayout`. `/admin/pos` is intentionally full-screen outside `AdminLayout`; `/pos` redirects to it.
- Use Convex hooks and generated `api` references. `useAdminQuery` is the existing error-returning read wrapper used by many staff pages; reuse it when the page needs recoverable loading/error UI.
- `useStaffAccess` resolves access through `api.staff.me`; do not authorize from Clerk metadata in frontend code. Keep menus, route permissions, and backend checks consistent with `convex/lib/permissions.ts`.
- Reuse `CartContext` and `ShippingContext`; they persist cart/shipping data locally. Do not persist passwords or treat locally stored values as server-trusted prices, identity, or stock.

## Components and Styling

- Use functional arrow components, React Hook Form for forms, lucide-react for icons, and shadcn/Radix primitives from `src/components/ui/`.
- `cn()` lives in `src/utils/cn.utils.ts`; use existing variants and design tokens rather than duplicating controls.
- Use `AdminDialog` for its existing operational dialog contract. The POS `PaymentDialog` intentionally remains a native `<dialog>`; do not migrate it casually.
- Other intentional native/custom exceptions include simple filter selects, file/hidden inputs, `ImageCarousel`, and complex content card-buttons. See [the migration tracker](../archive/shadcn-migration.md) for context, not as a mandate to resume completed migration work.
- Toasts use `sonner`, with `Toaster` mounted in `App.tsx`; preserve operation feedback deduplication by `requestId`.
- Implement loading, empty, error, disabled, and pending-operation states. Do not turn a failed read into an empty-success state.
- Keep semantic HTML, keyboard navigation, focus behavior, and labels/aria-labels. Localize default English primitive labels when the surrounding UI is Romanian.
- Use mobile-first Tailwind, verify tablet/desktop layouts, and preserve large POS touch targets (`Button` sizes `xl`/`2xl`).

## Themes and Localization

- Dark mode already exists: class-based Tailwind, `useTheme`, `ThemeToggle`, persisted `theme`, and `.dark` tokens in `src/index.css`.
- Pair hardcoded light surfaces/text/borders with appropriate dark variants. Existing patterns use stone-900/950 dark surfaces and stone-50/300/400 text. Preserve intentional image overlays and the white printable `PackingSlip`.
- Storefront UI uses `react-i18next` and `src/i18n/locales/{ro,en,de}.json`, with Romanian fallback. Keep corresponding locale keys aligned when adding translated public text.
- Product/category data translations use `useTranslatedProducts` / `useTranslatedProduct` / `useTranslatedCategories`; fallback is selected language → Romanian field → base field. Preserve stored base names and translation fields.
- Existing operational backoffice UI is primarily Romanian; follow its copy conventions rather than introducing an unrelated translation migration.

## Catalog and Images

- Storefront catalog reads `products.getAll` / `getById`; admin editing uses `products.listAdmin` so inactive/archived items remain available to staff.
- `products.stock` is physical workshop stock, not the public sellable quantity. Public `useProducts` maps `availableStock`; do not bypass paid-order claims when showing availability.
- `/catalog` is the custom-work showcase backed by `siteAssets`, not a separate product/order system.
- Reuse Convex storage upload functions, `imageCompression.utils.ts`, `ProductThumb`, and `useProductThumbnails`. Do not treat demo asset IDs as portable between environments.

## Operational Recovery

- Reuse `usePosPayment`, `useInventoryOperation`, `useStockOperation`, `useTransferAction`, and `useOrderAction` for their respective workflows.
- Preserve actor-scoped checkpoints and original request IDs across reloads/timeouts. Resolve the backend receipt/event before allowing a replacement action; a timeout is not proof of failure.
- See [backoffice context](../backoffice-context.md) for business rules and [testing guidance](testing.md) for the limits of jsdom and native-dialog mocks.
