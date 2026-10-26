# Migrare UI → shadcn/ui — tracking iterații

Planul complet cu prompturi per iterație: `~/.devin/plans/plan-d3ca269e2256ed83.md`
(document de lucru; dacă lipsește, cerutele de mai jos sunt self-contained).

## Fundație (făcută la Iterația 0)

- `cn()`: `src/utils/cn.utils.ts` (`clsx` + `tailwind-merge`).
- Tokeni shadcn: `:root` din `src/index.css` (HSL channels) + mapare în
  `tailwind.config.js` (`border`, `input`, `ring`, `background`, `foreground`,
  `primary` = amber-700, `secondary`, `muted`, `accent` = amber-50/900,
  `destructive` = red-600, `popover`, `card`; `--radius: 0.75rem`).
- Paleta `amber`/`stone` din Tailwind rămâne disponibilă — migrația e graduală.
- `components.json`: style `new-york`, baseColor `stone`, lucide icons,
  utils → `@/utils/cn.utils`.
- `tests/ui/setup.mjs`: stub-uri `ResizeObserver`, `scrollIntoView`,
  pointer capture, `matchMedia`, `PointerEvent`, `Element`, `NodeFilter`
  (necesare Radix).
- `tests/typescript-loader.mjs`: rezolvă aliasurile `@/`, `@hooks/`,
  `@context/`, `@assets/` (oglindește `tsconfig.app.json` + `vite.config.ts`).

## Reguli pentru toate iterațiile

- TS strict, arrow components, mobile-first Tailwind, semantic HTML.
- Texte/aria-labels în română identice cu cele existente (componentele
  shadcn au default-uri englezești — localizează).
- Paritate vizuală: nu redesena, doar înlocuiește primitivele.
- Nu se atinge: `convex/`, logica de business, fluxul de plată POS,
  `requestId`/checkpoint-uri, versiunile existente din `package.json`.
- Icoane: HeroIcons → lucide-react doar în fișierele atinse de iterație.
- Validare obligatorie: `tsc -p tsconfig.app.json --noEmit`, `npm run lint`,
  `npm test`, `./node_modules/.bin/vite build` (NU `npm run build` — sitemap-ul
  cere deployment-ul Convex).
- `PaymentDialog` rămâne `<dialog>` nativ (testele `pos-ui.test.mjs` fac
  `renderToStaticMarkup`); doar interiorul lui primește primitive.
- Touch targets POS: `Button` `size="xl"` (min-h-12) / `size="2xl"` (min-h-14).

## Checklist iterații

- [x] **0 — Fundație**: deps (clsx, tailwind-merge, cva, tailwindcss-animate),
  `cn()`, `components.json`, tokeni CSS, tailwind config, mock-uri jsdom.
- [x] **1 — Primitive** `src/components/ui/`: button(+xl/2xl), input, textarea,
  label, select, checkbox, radio-group, badge, card, table, skeleton,
  separator, alert, alert-dialog, dialog(+"Închide"+hideClose), dropdown-menu,
  popover, sheet, command, slider, sonner, form, accordion + deps Radix/cmdk/
  sonner + smoke test `tests/ui/UiPrimitives.test.tsx` (7 teste).
  Variante custom: Button `soft` (stone-100), `secondary`=stone-900,
  `xl`/`2xl` touch targets; Alert `warning`/`info`/`success`;
  Dialog `hideClose` + „Închide".
- [x] **2 — AdminDialog → Radix** (API `title`/`locked`/`onClose` identic;
  testul `cancel` → `Escape`; `onInteractOutside` blocat mereu — paritate
  cu `<dialog>` nativ care nu se închidea la click pe fundal).
- [x] **3 — Toast → sonner** (`Toaster` în App sub `<Router>`, poziție
  bottom-left, `closeButton` + `closeButtonAriaLabel="Închide notificarea"`;
  CartContext → `toast.success/error`; cele 3 feedback wrappers →
  `useEffect` + `toast` cu `onDismiss` = `dismissCompleted` și `id` dedup
  pe `requestId`; `action` din FulfillmentFeedback = `<Link>` ReactNode —
  testele izolate montează `<Toaster/>` în `MemoryRouter`).
  `src/components/Toast/` șters; `Stoc insuficient` e acum `toast.error`
  (înainte era stilul unic verde).
- [x] **4 — SearchableSelect → Command** (cmdk standalone cu listă absolută
  în același container — NU Popover: păstrează exact semantica
  outside-mousedown → `onBlur` cerută de RHF; props API identic;
  `CommandInput` a primit prop `bare` în `ui/command.tsx`; `<Command
  label>` produce label-ul ascuns cmdk → `aria-labelledby` corect,
  label vizibil înconjoară inputul pentru asociere implicită; cmdk
  suprascrie `id`/`aria-expanded` — aserțiunile din teste sunt pe
  `listbox`, nu pe aria-expanded; `setup.mjs` a primit
  `requestAnimationFrame`/`cancelAnimationFrame`; test nou
  `tests/ui/SearchableSelect.test.tsx` cu 7 teste).
- [x] **5 — Admin A**: AdminLayout (heroicons→lucide complet, Badge
  pendingRequests, Button ghost sidebar), AdminLogin (Alert destructive),
  Fairs (AdminFairs: Button/Alert/Button-asChild pentru link-uri;
  FairForm: Input+Label+Button; FairSellers: Input+Button;
  ArchiveFairDialog: Table+Alert+Button, AlertTriangle), Categories
  (Table+Input+Button+Alert), CustomWorks (Input+Label+Textarea+Button+
  Alert). `AdminRoute`/`StaffHome` — nimic de migrat (fără controale).
  Notă: lucide-react@0.344 are `AlertTriangle`, nu `TriangleAlert`.
- [x] **6 — Admin B**: AdminProducts + ProductForm (Input/Label/Textarea/
  Table/Badge/Button/Alert), AdminOrders + OrderDetail (Table+TableFooter,
  Badge statusuri, Card secțiuni, AlertDialog nu e folosit aici),
  InventoryReviewSummary + OrderInventoryReview (Alert warning/success,
  ArrowPath→RotateCw), AdminCustomers + CustomerDetail (Card statistici,
  Table, Dialog Radix pentru newsletter/edit, AlertDialog pentru ștergere).
  Selecturile de filtrare rămân native (stilizate ca Input) — testele folosesc
  `selectOptions`; Radix Select e rezervat randării custom.
- [x] **7 — Admin C**: Inventory (AdminInventory/AssignedFairStock/
  StockMovementsHistory: Table+Input+Button+Alert; StockOperationDialog +
  ProductPosOptionsDialog: Input/Label/Textarea/Checkbox/Alert+Button,
  AdminDialog păstrat; InventoryFeedback + StockOperationFeedback erau pe
  sonner din Iterația 3), Transfers (TransferList: Table+Badge+Button-asChild;
  TransferForm: Input/Label/Textarea/Alert+Button, SearchableSelect păstrat;
  TransferDetail: Table+Badge+Alert+Button, cele 4 AdminDialog interne
  rămân), Fulfillment (FulfillmentQueue: taburi role=tab pe Button ghost,
  Badge stare/număr, Button-asChild; FulfillmentDetail: Card secțiuni,
  Button, Input/Textarea/Label în dialoguri ship/reassign, select nativ;
  FulfillmentStepper: CheckIcon→Check; FulfillmentFeedback era pe sonner).
  `AssigneeChip` rămâne component custom (chip avatar+nume);
  `PackingSlip` rămâne markup print-only cu `<style>` scopat — Table
  primitives ar strica layout-ul de print. Selecturile/checkbox-urile
  simple rămân native (teste `selectOptions`/`getByRole('checkbox')`).
- [x] **8 — POS**: PointOfSale (Button asChild back-link/CTA, Alert
  warning/success-status/destructive, secondary „Administrează târgurile"),
  ProductPicker (Input search, Button ghost categorii aria-pressed, Button
  outline „Produse rapide"), OrderPanel (Button ghost qty/trash, Input
  discount, Button 2xl CASH/card, ghost „Goleste cosul"), PaymentDialog
  (`<dialog>` nativ neschimbat; interior: Alert warning/destructive, Input
  + Label, Button secondary-xl verify, 2xl confirm, outline-xl abandon).
  Tehnici: `[&_svg]:size-5` în className când iconița originală era h-5
  (tailwind-merge suprascrie size-4 din variantă); `min-h-11/12/14` păstrate
  via size default/xl/2xl sau `h-auto min-h-*`. Excepție: cardul-produs din
  ProductPicker rămâne `<button>` nativ — layout complex cu div-uri și
  iconițe h-12 pe care `[&_svg]:size-4` le-ar strica; selecturile
  (târg, reducere) rămân native. Toate aria-label-urile, textele și clasele
  asertate de `pos-ui.test.mjs` (12/12 verzi) intacte.
- [x] **9 — Storefront shell**: Header (meniu mobil → `Sheet side="top"`
  înlocuiește panoul custom translate-y; hamburger/cart → Button ghost,
  heroicons→lucide; cheie i18n nouă `nav.menu` ro/en/de pentru aria-label +
  SheetTitle sr-only), SettingsMenu → `DropdownMenu` controlat
  (`modal={false}`, `open`/`onOpenChange` + hover handlers păstrate pe
  trigger și content — comportamentul hover-desktop intact; my-orders →
  DropdownMenuItem asChild), LanguageSwitcher (Button ghost + aria-pressed
  + role=group), Hero (CTA → Button secondary), Services (ServiceCard →
  Card), `CategoryList` șters — cod mort, zero importuri.
  Footer/Layout/MaintenanceGuard/PageLoader — nimic de migrat.
  Notă bundle: index a crescut ~132KB — Radix dialog/dropdown din Header
  intră acum în bundle-ul principal (înainte erau doar în chunk-urile lazy
  de admin); Header e mereu vizibil, deci lazy-load nu ar fi câștigat.
- [x] **10 — Catalog**: `Products` (butoane filtre → Button outline pill,
  FunnelIcon→Filter lucide, eroare → Alert destructive; select sortare rămâne
  nativ — convenția filtrelor simple), `ProductFilters` (drawer mobil →
  `Sheet side="left"` w-80 + SheetTitle/SheetDescription sr-only + cheie i18n
  nouă `filters.close` ro/en/de), `FilterSection` → `Accordion` single
  collapsible, `CategoryFilter` → `Checkbox` + label htmlFor, `PriceFilter`
  → `Slider` dual-thumb (extins `slider.tsx`: thumbs dinamice + prop
  `thumbLabels` pentru aria-label-uri per-thumb) + Input/Label,
  `ProductCard` → Card + Badge stoc + Button outline, `ImageCarousel`
  (butoane overlay → Button ghost; widget rămâne custom — excepție
  documentată), `ProductDetailPage` (Badge stoc + Button CTA), `Catalog`
  (lightbox custom → Dialog Radix hideClose; butonul-article rămâne nativ —
  conținut complex, aceeași excepție ca ProductCard).
- [x] **11 — Flux cumpărare + cont**: `Cart` (butoane → Button outline/ghost
  cu aria-label-uri din chei existente `cart.remove`/`cart.updateQuantity`,
  banner anulare → Alert + Button dismiss, sumar → Card), `Checkout` (Card +
  Button), `ThankYou` (svg inline → lucide Check, link → Button asChild),
  `Login` (doar text-link — Clerk randează formularul propriu), `MyOrders`
  (status → Badge, link-uri → Button asChild, empty/list item → Card),
  `MyOrderDetail` (Badge, Button ghost înapoi, Card ×2, tabel → Table),
  `Shipping` (InputField/SelectField → Input/Label, select țară rămâne nativ
  cu RHF register — convenția selectelor simple; cele 4 checkbox-uri →
  Controller + Checkbox Radix păstrând validarea required pentru
  acceptPolicy; card verificare → Card + Input + Button), `LegalInformation`
  (box firma → Card), `UnderConstruction` (WrenchScrewdriverIcon → lucide
  Wrench). Legal PrivacyPolicy/ReturnPolicy/TermsAndConditions — proză pură,
  nimic de migrat.
- [x] **12 — Cleanup**: `rg '@heroicons' src/` → 0 (toate iconițele pe
  lucide). Sweep `rg '<button' src/` → 2 rămase, ambele excepții documentate
  (carduri cu conținut complex: `ProductPicker` product card, `Catalog`
  work card). Sweep `rg '<input' src/` → 3 rămase, toate obligatoriu native
  (`type="file"` ×2 în ProductForm/AdminCustomWorks, `type="hidden"` ×1 în
  FairSellers). `rg '<select'` rămân native — convenția selectelor simple.
  Reziduuri eliminate în acest pas: `AdminDialog` close → Button ghost,
  `AdminCustomers` newsletter card → Button, retry buttons ×3 în
  FulfillmentFeedback/InventoryFeedback/StockOperationFeedback → Button +
  erori role=alert → Alert, `AdminStaff` (omis din it. 5) → Input/Label/
  Badge/Button/Alert complet, checkbox-uri rămase → Checkbox Radix
  (CustomerDetail, ProductForm via Controller, FulfillmentDetail checklist,
  ProductPosOptionsDialog via Controller). Cod mort șters: `Services/`
  (0 importuri), `CategoryList` (it. 9), `Toast/` (it. 3). Docs:
  `.windsurfrules` #14 → lucide + shadcn primitives, `frontend.md` →
  convenția nouă + trimitere la acest tracker, `backoffice-context.md` →
  stack actualizat. Notă: `@heroicons/react` rămâne în package.json nefolosit
  — versiunile package.json nu se modifică fără aprobare explicită.

## Excepții conștiente (nu se „migrează" la Radix)

- `PaymentDialog` — `<dialog>` nativ + `onCancel preventDefault` (flux plată).
- `ImageCarousel` — widget custom păstrat, restilizat cu primitive.
- Carduri-buton cu conținut complex — `ProductPicker` product card,
  `Catalog` work card (`<button>` nativ; `Button` forțează flex/whitespace/
  svg-sizing care le-ar strica layout-ul).
- `<input type="file">` ×2, `<input type="hidden">` ×1 — fără echivalent shadcn.
- `<select>` native pentru filtre/opțiuni simple (RHF register, teste cu
  `selectOptions`); Radix Select rezervat randării custom.
