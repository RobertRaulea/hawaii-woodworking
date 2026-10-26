# Backoffice — context comun pentru etapele următoare

Audit: 2026-10-22, branch `docs/backoffice-context` (din `main` @ `1f79ffe`).
Citește acest document înainte de fiecare etapă. Actualizează-l doar cu schimbările relevante.

## 1. Stack real (verificat)

- Frontend: React 18 + TypeScript strict + Vite + Tailwind + React Router 7 + React Hook Form; icoane `lucide-react`; UI pe primitive shadcn/Radix din `src/components/ui/` (vezi `docs/shadcn-migration.md`).
- Auth: Clerk (`@clerk/clerk-react`) → JWT template `convex` → `convex/auth.config.ts` (`CLERK_JWT_ISSUER_DOMAIN`).
- Backend/DB: Convex (`convex/`), plăți Stripe Checkout + webhook HTTP `/stripe-webhook`, post-plată Oblio (factură) + Resend (email).
- Hosting: Vercel (`vercel.json` = doar rewrite SPA). GitHub: `RobertRaulea/hawaii-woodworking`. Nu există `.github/` (fără CI în repo).
- Convex (MCP `status`): development `exuberant-fox-228` (selectat de `.env.local`, read/write), production `upbeat-lyrebird-218` (read-only în MCP, neatins).
- Dev verificat prin MCP `functionSpec` + `tables`: funcțiile publicate coincid cu `convex/*.ts` din repo; tabelele declarate coincid cu `convex/schema.ts`.
- Env dev (doar nume): `CLERK_JWT_ISSUER_DOMAIN`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. Lipsesc în dev `OBLIO_*`, `RESEND_API_KEY`, `ADMIN_EMAIL` → automatizarea post-plată se oprește în dev (comportament așteptat, nu bug).

## 2. Rute și entry points

Toate rutele de backoffice sunt în `src/App.tsx`, sub `admin` + `<AdminRoute />`. **POS-ul este la `/admin/pos`** (nu `/pos`), randat în afara `AdminLayout` (ecran complet). Meniul: `NAV_ITEMS` din `src/pages/Admin/AdminLayout.tsx`. Login backoffice: `/admin/login` (`AdminLogin.tsx`).

| Meniu | Rută | Pagină | Funcții Convex |
|---|---|---|---|
| Vânzări la târg | `/admin/pos` | `PointOfSale/PointOfSale.tsx` (+ `OrderPanel`, `ProductPicker`, `PaymentDialog`, `usePosPayment.ts`) | `pos.listFairs/workspace/dailySummary/prepare/complete/cancel/lookup/openAttempts` |
| Târguri | `/admin/fairs` | `Fairs/AdminFairs.tsx`, `FairForm` (creare + editare), `FairSellers`, `ArchiveFairDialog` | `pos.listFairs/createFair/updateFair/getArchivePreview/archiveFair`, `staff.*FairSeller*` |
| Stocuri | `/admin/inventory` | `Inventory/AdminInventory.tsx`, `StockOperationDialog`, `StockMovementsHistory`, `ProductPosOptionsDialog`, `InventoryFeedback` | `pos.getStockOverview/getInventoryOperation/setProductOptions`, `inventory.*` |
| Transferuri | `/admin/transfers`, `/new`, `/:id`, `/:id/edit` | `Transfers/TransferList.tsx`, `TransferForm.tsx`, `TransferDetail.tsx`, `useTransferAction.ts` | `transfers.request/create/updateDraft/ship/receive/cancel/list/get/getEvent` |
| Products | `/admin/products` (`/admin` → redirect pe rol), `/products/new`, `/products/:id` | `Products/AdminProducts.tsx`, `ProductForm.tsx` | `products.listAdmin/createProduct/updateProduct/setProductActive/archiveProduct/restoreProduct/deleteProduct/generateProductImageUploadUrl`; public `products.getAll/getById` (doar produse active) |
| Categories | `/admin/categories` | `Categories/AdminCategories.tsx` | `categories.getAll/create/update/remove` |
| La comandă | `/admin/custom-works` | `CustomWorks/AdminCustomWorks.tsx` | `siteAssets.getByCategory('catalog')/generateAssetUploadUrl/saveSiteAsset` |
| Comenzi (Admin) | `/admin/orders`, `/orders/:id` | `Orders/AdminOrders.tsx`, `OrderDetail`, `OrderInventoryReview`, `InventoryReviewSummary`, `useOrderAction` | `orders.listAdmin/getAdmin/cancel/reconcileStock/getInventoryIssues`, `fulfillment.addNote/reassign` (vechile `getAll/getByDateRange/getById` păstrate pentru compatibilitate) |
| Fulfillment | `/admin/fulfillment`, `/fulfillment/:id` | `Fulfillment/FulfillmentQueue.tsx`, `FulfillmentDetail.tsx` | `fulfillment.queue/get/getEvent/claim/release/reassign/setChecked/addNote/markPacked/ship/markDelivered`, `transfers.list({status:'requested'})` |
| Customers | `/admin/customers`, `/customers/:id` | `Customers/AdminCustomers.tsx`, `CustomerDetail` | `customers.getAll/getById/updateCustomer/deleteCustomer/getNewsletterSubscribers` |

Shop public: `/`, `/products`, `/catalog`, `/product/:id`, `/cart`, `/shipping`, `/checkout`, `/thank-you`, `/my-orders(/:id)`, `/login`, pagini legale (sub `Layout`, fără restricție de rol).

## 3. Roluri și autorizare (implementat 2026-10-22, necommitat pe `docs/backoffice-context`)

- **Valori acceptate (exact, case-sensitive): `admin`, `seller`, `atelier`.** Orice altceva (lipsă, `ADMIN`, `VANZATOR`, `customer`, array) = fără acces intern. `ADMIN`/`VANZATOR` nu au fost folosite niciodată în cod.
- Sursă de încredere: JWT Clerk citit **doar în backend**: claim `role` ?? `publicMetadata.role` (`convex/lib/auth.ts`). `unsafeMetadata` nu se citește. Nicio funcție nu setează roluri; rolurile se setează manual de proprietar în Clerk Dashboard → user → Public metadata `{ "role": "seller" }`.
- Matrice centrală, pură: `convex/lib/permissions.ts` (`PERMISSIONS`, `parseRole`, `hasPermission`, `HOME_PATH`), importată de backend și frontend.
- Backend: `convex/lib/auth.ts` → `getStaff`, `requirePermission(ctx, perm)`, `requireAdmin`, `authorizedFairIds`, `canAccessFair`, `requireFairAccess`.
- Frontend: `src/hooks/useStaffAccess.ts` citește `staff.me` (backend), nu metadata Clerk; `useAdmin.ts` a fost șters. `AdminRoute permission="…"` protejează fiecare grup de rute; `StaffHome` redirecționează `/admin` → `HOME_PATH[role]`. Meniul `AdminLayout` e filtrat după permisiuni. `/pos` = alias redirect către `/admin/pos`.
- Locații autorizate: tabel `fairAssignments` (fairId, userId Clerk, assignedBy, createdAt). Admin alocă vânzători în `/admin/fairs` (`FairSellers.tsx`, câmp „ID utilizator Clerk (user_…)”) prin `staff.assignFairSeller/unassignFairSeller/listFairSellers`. Alocarea nu acordă rol. Admin și Atelier văd toate locațiile.
- Client = orice utilizator (autentificat sau guest) pentru Shop; paginile publice nu sunt restricționate pentru niciun rol.
- Identitatea operatorului: mereu `identity.subject` din JWT (`posAttempts.sellerId`, `actorId`).
- Identitatea clientului: `customers.getByClerkUserId` (fără argumente) și `upsertFromShipping`/checkout derivă userul din `ctx.auth`; `clerkUserId` trimis de client este acceptat de validator (compatibilitate) dar ignorat. Legarea unui client de cont se face numai dacă `email_verified` din JWT e `true` și emailul coincide; un email deja legat de alt cont → eroare „Adresa de email aparține unui cont existent…”.

### Matricea permisiunilor aplicate

| Permisiune | Admin | Atelier | Seller | Funcții backend / rute |
|---|---|---|---|---|
| `pos.sell` | ✓ | – | ✓ | `/admin/pos`; `pos.workspace`, `dailySummary`, `prepare` (+ acces târg); `complete/cancel/lookup/openAttempts` (doar propriile încercări, fără verificare de alocare → recuperare garantată) |
| `inventory.read` | ✓ | ✓ | ✓ (doar târguri alocate active) | `/admin/inventory`; `pos.listFairs`, `pos.getStockOverview` (`scope: 'assigned'` pentru seller: fără online/total/issues) |
| `inventory.readAll` | ✓ | ✓ | – | toate locațiile + online/total |
| `inventory.transfer` | ✓ | ✓ | – | `pos.transfer` (doar reluare chitanțe vechi), `pos.getInventoryOperation` |
| `transfers.view` | ✓ | ✓ | ✓ (doar solicitările proprii) | `/admin/transfers*`; `transfers.list/get/getEvent` |
| `transfers.request` | ✓ | – | ✓ (destinație = târg alocat) | `transfers.request`; Seller poate anula doar propria solicitare `requested` |
| `transfers.execute` | ✓ | ✓ | – | `transfers.create/updateDraft/ship/receive/cancel` |
| `inventory.adjust` | ✓ | ✓ | – | `inventory.receive/adjust/count/setLowStockThreshold/countSnapshot/getStockOperation` |
| `inventory.reconcile` | ✓ | ✓ | – | `orders.reconcileStock`, `orders.getInventoryIssues` |
| `products.posOptions` | ✓ | ✓ | – | `pos.setProductOptions` (SKU/favorit, nu preț) |
| `orders.fulfill` | ✓ | ✓ (redactat) | – | `/admin/fulfillment*`; `fulfillment.*` (fără `reassign`), `orders.updateStatus` doar `shipped→delivered`. Atelier vede: număr scurt, produse/cantități, checklist, destinatar + adresă, AWB, factura existentă; fără email/billing/prețuri/totaluri/Stripe |
| `orders.manage` | ✓ | – | – | `/admin/orders*`; `orders.listAdmin/getAdmin/cancel`, `fulfillment.reassign`; date complete și totaluri |
| `fairs.manage` | ✓ | – | – | `/admin/fairs`; `pos.createFair/updateFair/getArchivePreview/archiveFair`, `staff.*FairSeller*` |
| `catalog.manage` | ✓ | – | – | `/admin/products*`, `/admin/categories`, `/admin/custom-works`; `products.*`, `categories.*`, `siteAssets.*`, `seedCategories` (prin `requireAdmin`) |
| `customers.manage` | ✓ | – | – | `/admin/customers*`; `customers.getAll/getById/update/delete/newsletter`, `orders.getByCustomerId` |

Destinații implicite: Admin → `/admin/products` (nu există dashboard), Seller → `/admin/pos`, Atelier → `/admin/inventory`. Fără rol intern → mesaj „Acces intern indisponibil” + link la magazin. Rol fără permisiune pe rută → refuz + link la pagina proprie.

Neverificat din mediu: configurația JWT template-ului Clerk (claim `role`, `email`, `email_verified`). Dacă `email_verified` lipsește din template, clienții noi nu se mai leagă automat de cont (comenzile lor nu apar în „Comenzile mele”).

## 4. Schema Convex relevantă (`convex/schema.ts`)

- Catalog: `products` (`price` în lei float, `stock` = pool online, `trackStock`, `lowStockThreshold`, `sku`, `posFavorite`, `active?`, `archivedAt?`, `archivedBy?`), `categories` (produsele le referă prin `category` = nume), `siteAssets` (galeria „La comandă”, categorie `catalog`). Fără variante și fără eligibilitate separată online/POS: un produs inactiv/arhivat dispare din ambele canale.
- Stare produs (`convex/lib/products.utils.ts` `productStatus`): `archived` > `inactive` (`active === false`) > `active` (implicit, inclusiv câmp lipsă). Vandabil = `active`. Public `getAll/getById`, `pos.workspace`, `pos.prepare` și `checkoutSnapshot` acceptă doar vandabile; `pos.complete/cancel/lookup` nu verifică starea (recuperarea plăților rămâne posibilă). Produsele arhivate sunt refuzate în transferuri noi și `inventory.receive`; `adjust/count` rămân permise.
- Ștergere produs: doar fără istoric (mișcări, comenzi, vânzări/încercări POS, transferuri, operațiuni de stoc) și stoc 0; altfel se arhivează. Arhivarea e blocată de stoc la târg, transferuri deschise sau POS `prepared`. Snapshot-urile din comenzi/vânzări nu se modifică.
- SKU: o singură regulă `validateSku` (trim + majuscule, ≤80, unic case-insensitive) pentru `createProduct/updateProduct/pos.setProductOptions`.
- Categorii: redenumirea unei categorii folosite e refuzată (doar traducerile se pot edita); ștergerea categoriilor folosite rămâne blocată.
- Locații: `fairs` (`active`, `startsOn?`/`endsOn?` `YYYY-MM-DD`, arhivare cu `archiveOperationId`). Fiecare târg este propria locație de inventar (`fairInventory` după `fairId`); stare afișată derivată: Arhivat / Planificat / Încheiat / Activ (perioada e informativă, POS-ul depinde doar de `active`). Locația „atelier/online” = `products.stock` (`location: "workshop"` în audit). Nu există tabel de locații generic.
- Inventar: `fairInventory` (fair × product), `stockMovements` (audit: `transfer | sale | online_sale`), `inventoryOperations` (chitanțe idempotente transfer/arhivare, `requestId`).
- POS: `posAttempts` (`prepared | completed | cancelled`), `posSales` (bani în bani-întregi, `businessDate`).
- Comenzi: `orders` (`status`, `inventoryStatus: pending | applied | needs_review | released`, `inventoryUnfulfilledItems`, `paymentConfirmedAt`, `postPaymentScheduledAt`; aditiv: `fulfillmentStatus? preparing|packed`, `assignedTo/At`, `checklist`, `packedAt`, `shippedAt/By`, `awb`, `carrier`, `deliveredAt`, `cancelledAt/By`, `cancelReason`, `refundStatus? manual_required`, `inventoryRestockedAt`, `shipping` snapshot), `orderEvents` (istoric + idempotență, `by_order`, `by_request`), `customers` (PII: email, nume, adrese). `stockMovements.kind` + `online_cancel`. Dev: 12 comenzi vechi (7 plătite, 3 neplătite, 2 anulate), fără facturi.
- **Plată vs. fulfillment** (`convex/lib/orders.utils.ts`): `paymentStatus` = plătită doar prin `paymentConfirmedAt` (webhook Stripe) sau stare veche `paid/shipped/delivered`; personalul nu o poate schimba. `fulfillmentState` = `ready → preparing → packed → shipped → delivered` (+ `blocked`, `cancelled`); `preparing/packed` în `fulfillmentStatus`, iar `shipped/delivered` folosesc `status` existent. Eligibil: `paid`, plată confirmată, inventar `applied` sau vechi, neanulată. Nu există ramburs în model; o comandă neplătită nu intră niciodată în fulfillment. Vânzările POS nu creează comenzi.
- **Fulfillment**: preluare exclusivă (`assignedTo`; a doua preluare e refuzată), checklist obligatoriu înainte de ambalare, AWB/curier manual opțional, fără integrare curier/notificări. Admin poate realoca (eveniment cu from/to). Toate acțiunile au `requestId` reluat din `orderEvents`.
- **Anulare** (`orders.cancel`, Admin, motiv obligatoriu): neplătită → fără stoc (o plată Stripe ulterioară intră pe calea existentă `needs_review(cancelled)`); plătită și neexpediată → restocare o singură dată în Atelier din `inventoryAppliedItems` (`online_cancel`), `inventoryStatus: released`, `refundStatus: manual_required` (rambursarea se face manual în Stripe); comenzi vechi fără `inventoryAppliedItems` → fără restocare, cu notă; `cancelled + needs_review` → doar eliberează rezervarea; expediată/livrată → refuzat. `markOrderPaid` tratează `released` ca deja procesat (un webhook reluat nu mai reține stoc).
- **Checkout**: singura schimbare — `createPendingOrder` salvează snapshot-ul de livrare (`shipping`); comenzile vechi folosesc adresa clientului (etichetat în UI).
- Acces: `fairAssignments` (Seller ↔ târg; indexuri `by_user`, `by_fair`, `by_fair_user`).
- Operațiuni de stoc (2026-10-22, aditiv, fără migrare de date): `stockMovements.kind` + `receipt|adjustment|count`, `reason` + `production|damaged|lost|found|correction|other|count`, câmpuri `note`, `stockOperationId`, indexuri `by_location_fair`, `by_product_location`; tabel `stockOperations` (chitanță idempotentă, `by_request`). Separat de `inventoryOperations` deoarece acela cere `fairId/fairName` și e legat de transfer/arhivare.
- Transferuri (aditiv): `transfers` (status `requested|draft|in_transit|partially_received|received|cancelled`, from/to Atelier sau târg, linii cu requested/planned/shipped/received; indexuri `by_status`, `by_createdBy`), `transferEvents` (istoric + idempotență, `by_request`, `by_transfer`), `stockMovements.kind` + `transfer_out|transfer_in`, câmp `transferId`. Dev: 0 transferuri la publicare.
- Lipsesc: variante de produs, prag minim per locație, închiderea unei diferențe pierdute în tranzit, date de expediere (AWB/curier).

## 5. Regula actuală de inventar și rezervări

Logica comună: `convex/lib/inventory.utils.ts`.

- **Total** = `products.stock` (online) + Σ `fairInventory.quantity`. Fără al treilea pool „atelier”.
- **Transferuri** (`convex/transfers.ts`): Solicitare (Seller) → Draft → În tranzit → Recepționat (parțial/complet). Draft și anulare (doar `requested|draft`): fără stoc. `ship`: scade sursa all-or-nothing (Atelier ≤ disponibil după rezervări; târg ≤ sold și fără POS `prepared`), `transfer_out`; destinația nu crește. `receive`: adaugă doar cantitatea primită (≤ rest în tranzit), `transfer_in`; restul rămâne în tranzit (`partially_received`). Sursă ≠ destinație; târguri active. Fiecare acțiune are `requestId`, reluat din `transferEvents` înaintea verificărilor de stare. Transferurile/evenimentele nu se șterg. `getStockOverview` expune `inTransitStock` și îl include în `totalStock`. Arhivarea unui târg e blocată de transferuri deschise.
- **Transferul direct vechi** (`pos.transfer` → `transferInventory`) nu mai acceptă operațiuni noi; doar reia chitanțe existente (recuperare checkpoint `useInventoryOperation`). `StockTransferDialog` a fost șters; butonul „Transfer” din Stocuri deschide `/admin/transfers/new?productId=…&from=…`.
- **Arhivare târg** (`pos.archiveFair`): returnează stocul rămas online atomic, după preview confirmat; blocată de plăți POS nerezolvate.
- **POS**: `prepare` creează intenția (un singur `prepared` per vânzător); `complete` re-validează prețuri și stocul la târg (`buildSale` din `convex/lib/pos.utils.ts`), scade `fairInventory`, scrie `stockMovements kind:"sale"`; idempotent prin `posSales.by_request`. Card = aprobare pe terminal separat.
- **Checkout online** (`checkout.createCheckoutSession`): **nu rezervă stoc**. Verifică doar disponibilitatea (`checkoutSnapshot` → `onlineDeductions`) și creează comanda `pending` + sesiune Stripe. Comenzile `pending` nu blochează stoc; sesiunile expirate nu sunt tratate (rămân `pending`).
- **Scădere online**: doar la webhook `checkout.session.completed` → `orders.markOrderPaid` (idempotent: `paymentConfirmedAt`/`inventoryStatus`). Stoc suficient → scade `products.stock`, `stockMovements kind:"online_sale"`, `inventoryStatus:"applied"`, programează post-plata o singură dată. Lipsă de stoc → alocare parțială + `needs_review`. Plătită după anulare → `needs_review` (`cancelled`), fără scădere.
- **„Rezervare” efectivă** = cantitățile nealocate din comenzile plătite `needs_review` (`onlineReviewClaims`); acestea scad stocul online disponibil în catalog, transferuri și POS overview. Reconciliere: `orders.reconcileStock` (admin). Expedierea (`shipped/delivered`) este blocată până la `applied`.
- **Locații fizice**: Atelier = `products.stock` (audit `workshop`) și fiecare târg = `fairInventory`. Online este canalul care vinde din Atelier: Atelier fizic / rezervat / disponibil = `onlinePhysicalStock` / `onlineHeldOrders` / `onlineStock`. Târguri: rezervat 0 (POS `prepare` nu rezervă), disponibil = fizic.
- **Operațiuni de stoc** (`convex/inventory.ts`, permisiune `inventory.adjust`): `receive` (doar Atelier, +cant.), `adjust` (±, motiv + notă 3–500 obligatorie), `count` (așteptat/numărat/diferență), `setLowStockThreshold`. Fiecare scrie atomic stoc + `stockMovements` + `stockOperations`; idempotente pe `requestId` (replay verificat înaintea oricărei validări). Fără stoc negativ; scăderea în Atelier nu poate coborî sub cantitatea rezervată; scăderea/inventarierea la târg e blocată de o încercare POS `prepared` pentru produs.
- **Inventariere fără suprascriere veche**: `countSnapshot` dă `expectedQuantity` + `lastMovementId`; `count` refuză dacă soldul sau ultima mișcare pentru produs+locație s-au schimbat („Revalidează numărătoarea”). Atelier caută ultima mișcare după prefix `productId+workshop` (rândurile de transfer/arhivare au `fairId`) — verificat pe dev prin MCP (index = scanare completă).
- **Prag minim**: `products.lowStockThreshold` (implicit 5, folosit și de magazin pe disponibilul online). În Stocuri „stoc scăzut” = disponibil Atelier ≤ prag.
- **Editarea directă a stocului a fost eliminată**: `updateProduct({stock})` și `createProduct({stock≠0})` aruncă eroare; `products.updateStock` șters; `ProductForm` arată stocul read-only cu link către Stocuri. Rămân în afara auditului: `seedProducts` (admin, seeding) și `decrementStock` (internal, nefolosit).

## 6. Componente și hook-uri reutilizabile

- `AdminLayout` (sidebar responsive), `AdminRoute`, `AdminDialog` (wrapper peste `Dialog` din `src/components/ui/` — Radix; `title`, `locked`, `onClose`; `locked` blochează Escape/outside-click și dezactivează butonul de închidere), notificări prin `sonner` (`Toaster` montat în `App` sub `<Router>`), `SearchableSelect`.
- `useAdminQuery` (query cu eroare în română în loc de throw), `useInventoryOperation` (checkpoint local + reluare `requestId`), `InventoryFeedback`, `useTransferAction` (checkpoint `hawaii:transfers:action:v1:{actorId}`), `src/utils/inventory.utils.ts`, `src/types/inventory.types.ts`.
- Stocuri: `useStockOperation` (checkpoint local `hawaii:inventory:stock-op:v1:{actorId}`, retry cu același `requestId`), `StockOperationDialog`, `StockOperationFeedback`, `StockMovementsHistory` (`usePaginatedQuery`), `AssignedFairStock` (Seller), `locationStock`/`filterStockRows` în `src/utils/inventory.utils.ts`.
- POS: `usePosPayment`, `OrderPanel`, `ProductPicker`, `PaymentDialog`, `pos.utils.ts` (bani).
- Temă: Tailwind `stone`/`amber`, sidebar `bg-stone-900`. **Nu există dark mode** (fără `darkMode` în `tailwind.config.js`, fără clase `dark:`).
- Limba: Târguri/Stocuri/POS/La comandă sunt în română; Products/Categories/Orders/Customers și `AdminLayout`/`AdminRoute` sunt încă în engleză.

## 7. Comenzi de testare

| Scop | Comandă |
|---|---|
| Unit/backend (Node 22, dublu tranzacțional Convex) | `npm run test:unit` |
| UI (React Testing Library + jsdom) | `npm run test:ui` |
| Toate | `npm test` |
| Typecheck frontend | `./node_modules/.bin/tsc -p tsconfig.app.json --noEmit` |
| Typecheck backend POS | `./node_modules/.bin/tsc --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution bundler convex/pos.ts convex/schema.ts` |
| Config TS | `node --test tests/typescript-config.test.mjs` |
| Lint | `npm run lint` |
| Bundle offline | `./node_modules/.bin/vite build` (`npm run build` rulează prebuild sitemap care interoghează Convex) |
| Sync backend dev | `./node_modules/.bin/convex dev --once` (doar după verificarea `.env.local` = dev) |

Fixture backend: `tests/helpers/convexFixture.mjs`; fixture UI: `tests/ui/fixtures.ts`, `tests/ui/setup.mjs`. Teste existente: `pos*`, `fairs-backend`, `inventory-backend`, `orders-stock`, UI pentru POS, Fairs, Inventory, StockTransfer, OrderInventoryReview.

Baseline 2026-10-22 (Node v22.22.0): `test:unit` 68/68, `test:ui` 33/33, ambele `tsc` OK, `vite build` OK. `npm run lint`: 4 erori preexistente `no-explicit-any` (`convex/lib/translations.ts`, `useTranslatedCategories.ts`, `useTranslatedProducts.ts`) + 7 warnings; nu sunt regresii.

După roluri (2026-10-22): `test:unit` 75/75, `test:ui` 41/41, `tsc` OK, `vite build` OK, lint identic cu baseline. Teste noi: `tests/authorization-backend.test.mjs` (parseRole, matrice 17 funcții × 6 identități, locații, escaladare, redactare Atelier, regresie POS Admin/Seller) și `tests/ui/StaffAccess.test.tsx` (rute/meniu per rol, stoc Seller, POS Seller, FairSellers). Typecheck backend extins: adaugă `convex/staff.ts convex/orders.ts convex/customers.ts` la comanda de mai sus. Dev sincronizat (`convex dev --once`); verificat prin MCP `run` fără identitate: `staff:me` → `null`, `pos:getStockOverview` și `seedCategories` → „Unauthorized”, `customers:getByClerkUserId` → `null`.

După Stocuri (2026-10-22): `test:unit` 87/87, `test:ui` 48/48, `tsc` OK (backend strict + `convex/inventory.ts convex/products.ts`), `vite build` OK, lint identic cu baseline. Teste noi: `tests/stock-operations-backend.test.mjs` (intrare, ajustare, rezervări, retry, conflict inventariere vs. POS/transfer, istoric paginat, acces Seller, blocarea stocului din produs) și `tests/ui/StockOperations.test.tsx` (filtre, dublu click, retry cu același `requestId`, notă obligatorie, conflict + revalidare, Seller fără operațiuni, ProductForm fără stoc). Fixture: `paginate` + `_creationTime` determinist. Dev sincronizat; MCP fără identitate: `inventory:movements` → „Unauthorized”.

După Transferuri (2026-10-22): `test:unit` 101/101, `test:ui` 52/52, `tsc` OK (backend strict + `convex/transfers.ts`), `vite build` OK, lint identic cu baseline. Teste noi: `tests/transfers-backend.test.mjs` (flux complet, parțial, supra-recepție, târg↔târg↔Atelier, rezervări, POS în curs, retry, anulare, permisiuni, arhivare blocată, reluare `pos.transfer`, conflict inventariere) și `tests/ui/Transfers.test.tsx`. Testele vechi care creau transferuri directe au fost mutate pe noul flux. Dev sincronizat; MCP fără identitate: `transfers:list` → „Unauthorized”.

După Catalog/Târguri (2026-10-22): `test:unit` 116/116, `test:ui` 59/59, `tsc` OK (backend strict + `products/categories`), `vite build` OK, lint identic cu baseline. Teste noi: `tests/catalog-fairs-backend.test.mjs` (editare/SKU/permisiuni, reflectare în POS, dezactivare/arhivare/ștergere, snapshot-uri neschimbate, categorii, perioadă târg, asociere târg–locație după transfer) și `tests/ui/CatalogFairs.test.tsx`. Dev: 4 produse, toate active (câmp lipsă), 2 târguri fără perioadă → magazinul nu se schimbă; MCP fără identitate: `products:listAdmin` → „Unauthorized”.

După Comenzi/Fulfillment (2026-10-22): `test:unit` 127/127, `test:ui` 67/67, `tsc` OK (backend strict + `fulfillment/orders/checkout`), `vite build` OK, lint identic cu baseline. Teste noi: `tests/fulfillment-backend.test.mjs` (anulare/restocare unică/plată după anulare, rezervări, preluare concurentă, comenzi neplătite, tranziții, acces + redactare, retry, regresie checkout/POS) și `tests/ui/OrdersFulfillment.test.tsx`. Dev sincronizat; MCP fără identitate: `fulfillment:queue` → „Unauthorized”; 7 comenzi vechi plătite sunt eligibile pentru pregătire.

## 8. Starea modulelor

| Modul | Stare actuală | Ce lipsește |
|---|---|---|
| Vânzări la târg (`/admin/pos`) | Completă: POS idempotent, cash/card, discount, recuperare plăți, sumar zilnic; Admin + Seller (doar târguri alocate) | — |
| Târguri (`/admin/fairs`) | Completă: creare/editare cu perioadă, stare derivată, locație de inventar proprie, linkuri POS/Stoc/Transferuri/Transfer nou, alocare vânzători, arhivare atomică | Selectare vânzător după nume/email (acum ID Clerk manual) |
| Stocuri (`/admin/inventory`) | Completă: căutare nume/SKU, filtre locație/categorie/disponibilitate, fizic/rezervat/disponibil/prag, istoric paginat; Admin/Atelier: intrare, ajustare, inventariere, prag; coloană „În tranzit”; Seller read-only pe târgurile alocate | Variante (nu există în schemă); prag per locație |
| Transferuri (`/admin/transfers`) | Completă: listă + filtre stare/locație, detalii, mai multe produse, note, istoric; Seller: solicitări proprii | Închiderea diferenței pierdute în tranzit; paginare (listă limitată la 200 recente) |
| Products | Completă: căutare nume/SKU, filtre categorie/stare, paginare 20/pagină, SKU, imagini, preț, activ/inactiv, arhivare/restaurare, ștergere doar fără istoric, stoc informativ cu link la Stocuri (doar Admin) | Variante (nu există în schemă) |
| Categories | Completă: CRUD admin, număr produse, redenumire/ștergere blocate pentru categorii folosite | — |
| La comandă | Completă: galerie `siteAssets` editabilă (titlu, preț, descriere, imagine) | Nu e flux de comenzi la comandă, doar vitrină |
| Comenzi (Admin) | Completă: listă paginată 25/pagină (max. 1000 recente), căutare număr/client/email/sesiune Stripe, filtre perioadă/plată/fulfillment, detalii cu snapshot preț și totaluri, livrare, notițe, istoric, factură existentă, anulare controlată, realocare | Paginare server-side peste 1000 comenzi |
| Customers | Parțială: listă, detaliu, editare, ștergere, newsletter (admin) | UI în engleză; ștergerea nu verifică comenzile asociate |
| Roluri Seller/Atelier | Completă (cod + teste, dev) | Setarea manuală a rolurilor în Clerk; commit/PR; deploy coordonat |
| Reaprovizionare | Completă ca solicitare de transfer (`requested`) | — |
| Fulfillment | Completă: coadă (De pregătit/În pregătire/Ambalate/Expediate recent), preluare, checklist, notițe, ambalare, expediere cu AWB manual, livrare, listă imprimabilă, secțiune separată de solicitări de reaprovizionare | Integrare curier (intenționat absentă) |

## 9. Blocaje și riscuri reale

1. **Rezolvat (2026-10-22):** `seedCategories` → admin; `customers.getByClerkUserId` → `identity.subject`; `upsertFromShipping`/checkout ignoră `clerkUserId` din client și leagă doar pe email verificat; `orders.getByCustomerId` → admin. Rămas: `products.getStripePriceIds` public (risc mic).
2. **Rezolvat (2026-10-22):** stocul nu se mai modifică din produs; toate schimbările trec prin operațiuni auditate (§5). Deploy coordonat: frontend-ul vechi din producție trimite `stock` la `updateProduct` și ar primi eroare cu backend-ul nou.
3. Rolurile `seller`/`atelier` trebuie setate manual în Clerk (Public metadata). Configurația JWT template-ului Clerk (claim `role`, `email_verified`) nu poate fi verificată din acest mediu.
4. **Deploy coordonat:** `customers.getByClerkUserId` nu mai acceptă `clerkUserId` → frontend-ul vechi din producție ar eșua cu backend-ul nou; Vercel și Convex prod trebuie publicate împreună (nu s-a făcut deploy în prod).
5. Schimbare de comportament: un guest care folosește emailul unui cont înregistrat primește eroare și trebuie să se autentifice.
6. Checkout-ul nu rezervă stoc; supravânzarea online e tratată ulterior prin `needs_review` (comportament intenționat; nu se reconstruiește).
7. Fără CI în repo; validarea e locală.
8. Catalog: `ProductForm` citește din `listAdmin` (produsele inactive rămân editabile); scripturile (`generate-sitemap`, `seedStripe`) folosesc `getAll` și văd doar produse active. Deploy coordonat: frontend-ul vechi din producție folosește `getAll` în Admin și n-ar mai vedea produsele inactive/arhivate.
9. Comenzi: rambursările nu sunt integrate (se fac manual în Stripe; comanda arată „rambursare manuală necesară”); comenzile vechi anulate nu se restochează automat; `orders.updateStatus` mai permite doar `shipped→delivered` — frontend-ul vechi din producție (select liber de status) ar primi erori, deci deploy coordonat; lista admin e limitată la 1000 de comenzi recente.
10. Transferuri: o diferență pierdută în tranzit rămâne deschisă (`partially_received`) — nu există încă închidere auditată; reluarea `create/request` cu același `requestId` returnează transferul inițial chiar dacă argumentele diferă (ID-urile sunt UUID per acțiune). Deploy coordonat: frontend-ul vechi apelează `pos.transfer` pentru transferuri noi, care acum sunt refuzate.

## 10. Reguli comune pentru etapele următoare

### A. Reutilizare și siguranță
- Păstrează tema și componentele existente (dark mode nu există acum; nu-l introduce fără cerere).
- UI nou în română.
- Nu reconstrui POS-ul sau checkout-ul.
- Nu dubla catalogul, inventarul, locațiile sau comenzile.
- Fără refactorizări generale sau dependențe noi fără necesitate.
- Fără resetări, date fictive în producție, migrări destructive sau deploy în producție.
- Lucrează pe branch dedicat.
- Nu expune secrete sau date personale în loguri.

### B. Roluri Clerk
- Client: Shop. Seller: POS și Inventar limitat. Atelier: Inventar și Fulfillment. Admin: acces complet.
- Seller: POS și citire stoc în locațiile autorizate; solicitări de reaprovizionare; fără ajustări, executare transferuri, editare prețuri sau comenzi online.
- Atelier: operațiuni inventar, transferuri și fulfillment; fără administrare utilizatori, editare prețuri sau rapoarte financiare globale; date clienți strict necesare pregătirii și expedierii.
- Roluri: `admin`, `seller`, `atelier` (§3). Orice permisiune nouă se adaugă în `convex/lib/permissions.ts` și se verifică cu `requirePermission`. Nu crea roluri paralele și nu atribui automat privilegii.
- Shop nu înseamnă blocarea paginilor publice pentru Seller/Atelier.
- Protejează rutele și funcțiile backend, nu doar meniurile.

### C. Convex
- Folosește Convex MCP (deployment dev `exuberant-fox-228`) când inspectezi/modifici schema, queries, mutations sau verifici integrarea.
- Nu repeta inspecțiile deja documentate aici dacă nu s-a schimbat contextul.
- Aplicația folosește integrarea Convex existentă la rulare, nu MCP.
- Raportează lipsa accesului; nu pretinde verificări neexecutate.
- Fără stoc negativ, dublă scădere sau operațiuni duplicate la retry.
- Respectă rezervările (`needs_review` claims) și auditul existent (`stockMovements`, `inventoryOperations`).

### D. Eficiență Fusion
- Citește acest document înainte de fiecare etapă.
- Inspectează doar fișierele relevante.
- Dacă funcționalitatea există și este corectă, reutilizeaz-o.
- Alege o singură implementare compatibilă cu proiectul.
- Plan scurt, apoi implementare; fără alternative speculative.
- Nu elimina testele de securitate, stoc sau bani pentru economie.
- Raport final scurt: modificări, teste, blocaje.
- Actualizează documentul doar cu schimbările relevante.
- Oprește-te după sarcina cerută.
