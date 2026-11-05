# Backoffice — context comun pentru etapele următoare

Harta modulelor și regulile de lucru de mai jos au fost confruntate cu sursele locale la 2026-11-02. Documentul conține și istoricul auditului început la 2026-10-22.
Citește secțiunile relevante pentru sarcină. Numărătorile, rezultatele de teste, branch-urile, checklist-urile de lansare și afirmațiile despre deploy din notele datate sunt istorice, nu dovadă despre starea actuală. Pentru medii/publicare folosește [runbook-ul de medii](environments.md); pentru autorizare și comportament verifică sursele indicate. Nu executa o procedură istorică în locul runbook-ului curent.

## 1. Stack real (verificat)

- Frontend: React 18 + TypeScript strict + Vite + Tailwind + React Router 7 + React Hook Form; icoane `lucide-react`; UI pe primitive shadcn/Radix din `src/components/ui/` (vezi `docs/archive/shadcn-migration.md`).
- Auth: Clerk (`@clerk/clerk-react`) → JWT template `convex` → `convex/auth.config.ts` (`CLERK_JWT_ISSUER_DOMAIN`).
- Backend/DB: Convex (`convex/`), plăți Stripe Checkout + webhook HTTP `/stripe-webhook`, post-plată Oblio (factură) + Resend (email).
- Hosting: Vercel (`vercel.json`: rewrite SPA, cache și headere de securitate, inclusiv CSP Report-Only). GitHub: `RobertRaulea/hawaii-woodworking`. `.github/dependabot.yml` există; nu există workflow-uri CI în checkout-ul verificat.
- Convex (MCP `status`): development `exuberant-fox-228` (selectat de `.env.local`, read/write), production `upbeat-lyrebird-218` (read-only în MCP, neatins).
- Dev verificat prin MCP `functionSpec` + `tables`: funcțiile publicate coincid cu `convex/*.ts` din repo; tabelele declarate coincid cu `convex/schema.ts`.
- Medii: contractele curente sunt în `shared/environment.ts` și `convex/lib/environment.ts`. În TEST, `postPayment.handlePostPayment` oprește explicit facturarea și emailurile înainte de citirea credențialelor. Prezența sau lipsa variabilelor într-un deployment trebuie verificată separat, fără afișarea valorilor secrete.

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
| Panou | `/admin/dashboard` | `Dashboard/Dashboard.tsx` | `reports.dashboard({today})` (secțiuni după permisiune) |
| Rapoarte (Admin) | `/admin/reports` (filtre în URL: `from`, `to`, `channel`, `fairId`) | `Reports/Reports.tsx`, `src/utils/csv.utils.ts`, `src/utils/date.utils.ts` | `reports.summary`, `pos.listFairs`; Târguri refolosește `reports.summary` pentru „Azi” + link „Raport” |
| Customers | `/admin/customers`, `/customers/:id` | `Customers/AdminCustomers.tsx`, `CustomerDetail` | `customers.getAll/getById/updateCustomer/deleteCustomer/getNewsletterSubscribers` |

Shop public: `/`, `/products`, `/catalog`, `/product/:id`, `/cart`, `/shipping`, `/checkout`, `/thank-you`, `/my-orders(/:id)`, `/login`, pagini legale (sub `Layout`, fără restricție de rol).

## 3. Roluri și autorizare

- **Valori acceptate (exact, case-sensitive): `admin`, `seller`, `atelier`.** Orice altceva (lipsă, `ADMIN`, `VANZATOR`, `customer`, array) = fără acces intern. `ADMIN`/`VANZATOR` nu au fost folosite niciodată în cod.
- Sursă de încredere: JWT Clerk citit **doar în backend**: claim `role` ?? `publicMetadata.role` (`convex/lib/auth.ts`). `unsafeMetadata` nu se citește. Nicio funcție nu acordă rolul autorizativ; rolurile se setează manual de proprietar în Clerk Dashboard → user → Public metadata `{ "role": "seller" }`.
- Matrice centrală, pură: `convex/lib/permissions.ts` (`PERMISSIONS`, `parseRole`, `hasPermission`, `HOME_PATH`), importată de backend și frontend.
- Backend: `convex/lib/auth.ts` → `getStaff`, `requirePermission(ctx, perm)`, `requireAdmin`, `authorizedFairIds`, `canAccessFair`, `requireFairAccess`.
- Frontend: `src/hooks/useStaffAccess.ts` citește `staff.me` (backend), nu metadata Clerk; `useAdmin.ts` a fost șters. `AdminRoute permission="…"` protejează fiecare grup de rute; `StaffHome` redirecționează `/admin` → `HOME_PATH[role]`. Meniul `AdminLayout` e filtrat după permisiuni. `/pos` = alias redirect către `/admin/pos`.
- Locații autorizate: tabel `fairAssignments` (fairId, userId Clerk, assignedBy, createdAt). Admin alocă vânzători în `/admin/fairs` (`FairSellers.tsx` selectează după email; `SellerEmailForm` asociază un email pentru un ID Clerk lipsă) prin `staff.assignFairSeller/unassignFairSeller/listFairSellers/sellers`. Alocarea nu acordă rol. Admin și Atelier văd toate locațiile.
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
| `transfers.view` | ✓ | ✓ | ✓ (doar solicitările proprii) | `/admin/transfers*`; `transfers.list/get/getEvent`; `receive`/`cancel` cu verificări suplimentare de rol |
| `transfers.request` | ✓ | – | ✓ (destinație = târg alocat) | `transfers.request`; Seller poate anula doar propria solicitare `requested` prin `transfers.cancel` |
| `transfers.execute` | ✓ | ✓ | – | `transfers.create/updateDraft/ship`; permite și `receive/cancel` fără restricția de solicitant |
| `inventory.adjust` | ✓ | ✓ | – | `inventory.receive/adjust/count/setLowStockThreshold/countSnapshot/getStockOperation` |
| `inventory.reconcile` | ✓ | ✓ | – | `orders.reconcileStock`, `orders.getInventoryIssues` |
| `products.posOptions` | ✓ | ✓ | – | `pos.setProductOptions` (SKU/favorit, nu preț) |
| `orders.fulfill` | ✓ | ✓ (redactat) | – | `/admin/fulfillment*`; `fulfillment.*` (fără `reassign`), `orders.updateStatus` doar `shipped→delivered`. Atelier vede: număr scurt, produse/cantități, checklist, destinatar + adresă, AWB, factura existentă; fără email/billing/prețuri/totaluri/Stripe |
| `orders.manage` | ✓ | – | – | `/admin/orders*`; `orders.listAdmin/getAdmin/cancel`, `fulfillment.reassign`; date complete și totaluri |
| `reports.view` | ✓ | – | – | `/admin/reports`; `reports.summary`; în `reports.dashboard` secțiunea `sales` și `exceptions.posPrepared` |
| `dashboard.view` | ✓ | ✓ | ✓ | `/admin/dashboard`; `reports.dashboard` — fiecare secțiune cere propria permisiune (`orders.fulfill` → fulfillment, `inventory.readAll` → stoc redus, `transfers.view` → transferuri (Seller: doar proprii), `inventory.reconcile` → excepții, `pos.sell` fără `reports.view` → POS azi pe târgurile alocate); secțiune nepermisă = `null` |
| `fairs.manage` | ✓ | – | – | `/admin/fairs`; `pos.createFair/updateFair/getArchivePreview/archiveFair`, `staff.sellers/*FairSeller*` |
| `catalog.manage` | ✓ | – | – | `/admin/products*`, `/admin/categories`, `/admin/custom-works`; `products.*`, `categories.*`, `siteAssets.*`, `seedCategories` (prin `requireAdmin`) |
| `customers.manage` | ✓ | – | – | `/admin/customers*`; `customers.getAll/getById/update/delete/newsletter`, `orders.getByCustomerId` |
| `staff.manage` | ✓ | – | – | `/admin/staff`; `staff.setDirectoryEntry` (afișare/selecție, nu rol autorizativ) |

Destinații implicite: Admin → `/admin/dashboard`, Seller → `/admin/pos`, Atelier → `/admin/inventory`. Fără rol intern → mesaj „Acces intern indisponibil” + link la magazin. Rol fără permisiune pe rută → refuz + link la pagina proprie.

Neverificat din mediu: configurația JWT template-ului Clerk (claim `role`, `email`, `email_verified`). Dacă `email_verified` lipsește din template, clienții noi nu se mai leagă automat de cont (comenzile lor nu apar în „Comenzile mele”).

## 4. Schema Convex relevantă (`convex/schema.ts`)

- Catalog: `products` (`price` în lei float, `stock` = pool online, `trackStock`, `lowStockThreshold`, `sku`, `posFavorite`, `active?`, `archivedAt?`, `archivedBy?`), `categories` (produsele le referă prin `category` = nume), `siteAssets` (galeria „La comandă”, categorie `catalog`). Fără variante și fără eligibilitate separată online/POS: un produs inactiv/arhivat dispare din ambele canale.
- Stare produs (`convex/lib/products.utils.ts` `productStatus`): `archived` > `inactive` (`active === false`) > `active` (implicit, inclusiv câmp lipsă). Vandabil = `active`. Public `getAll/getById`, `pos.workspace`, `pos.prepare` și `checkoutSnapshot` acceptă doar vandabile; `pos.complete/cancel/lookup` nu verifică starea (recuperarea plăților rămâne posibilă). Produsele arhivate sunt refuzate în transferuri noi și `inventory.receive`; `adjust/count` rămân permise.
- Ștergere produs: doar fără istoric (mișcări, comenzi, vânzări/încercări POS, transferuri, operațiuni de stoc) și stoc 0; altfel se arhivează. Arhivarea e blocată de stoc la târg, transferuri deschise sau POS `prepared`. Snapshot-urile din comenzi/vânzări nu se modifică.
- SKU: o singură regulă `validateSku` (trim + majuscule, ≤80, unic case-insensitive) pentru `createProduct/updateProduct/pos.setProductOptions`.
- Categorii: redenumirea unei categorii folosite e refuzată (doar traducerile se pot edita); ștergerea categoriilor folosite rămâne blocată.
- Locații: `fairs` (`active`, `startsOn?`/`endsOn?` `YYYY-MM-DD`, arhivare cu `archiveOperationId`). Fiecare târg este propria locație de inventar (`fairInventory` după `fairId`); stare afișată derivată: Arhivat / Planificat / Încheiat / Activ (perioada e informativă, POS-ul depinde doar de `active`). Locația „atelier/online” = `products.stock` (`location: "workshop"` în audit). Nu există tabel de locații generic.
- Inventar: `fairInventory` (fair × product), `stockMovements` (audit: `transfer | transfer_out | transfer_in | sale | online_sale | online_cancel | receipt | adjustment | count`), `inventoryOperations` (chitanțe transfer/arhivare), `stockOperations` (intrare/ajustare/inventariere), `transferEvents` (flux transfer), toate idempotente după `requestId`.
- POS: `posAttempts` (`prepared | completed | cancelled`), `posSales` (bani în bani-întregi, `businessDate`).
- Comenzi: `orders` (`status`, `inventoryStatus: pending | applied | needs_review | released`, `inventoryUnfulfilledItems`, `paymentConfirmedAt`, `postPaymentScheduledAt`; aditiv: `fulfillmentStatus? preparing|packed`, `assignedTo/At`, `checklist`, `packedAt`, `shippedAt/By`, `awb`, `carrier`, `deliveredAt`, `cancelledAt/By`, `cancelReason`, `refundStatus? manual_required`, `inventoryRestockedAt`, `shipping` snapshot), `orderEvents` (istoric + idempotență, `by_order`, `by_request`), `customers` (PII: email, nume, adrese). `stockMovements.kind` + `online_cancel`. Dev: 12 comenzi vechi (7 plătite, 3 neplătite, 2 anulate), fără facturi.
- **Plată vs. fulfillment** (`convex/lib/orders.utils.ts`): `paymentStatus` = plătită doar prin `paymentConfirmedAt` (webhook Stripe) sau stare veche `paid/shipped/delivered`; personalul nu o poate schimba. `fulfillmentState` = `ready → preparing → packed → shipped → delivered` (+ `blocked`, `cancelled`); `preparing/packed` în `fulfillmentStatus`, iar `shipped/delivered` folosesc `status` existent. Eligibil: `paid`, plată confirmată, inventar `applied` sau vechi, neanulată. Vânzările POS nu creează comenzi.
- **Ramburs (COD)** (`codOrders.placeCodOrder`, TEST): `paymentMethod: "cod"`, `stripeSessionId = "cod:<requestId>"`, stoc alocat la plasare (`applied`, status rămâne `pending`, fără `needs_review` — stoc insuficient respinge tot), livrată → `paymentConfirmedAt` (încasarea e la curier), anulare restochează fără `refundStatus`, facturare Oblio manuală, emailuri spun „de încasat". O comandă `pending` ne-COD nu intră niciodată în fulfillment.
- **Livrare** (`convex/shipping.ts`, permisiune `shipping.manage` — doar Admin, `/admin/shipping`): `shippingSettings` singleton în bani-întregi (tarif fix, prag gratuit opțional, ramburs activ/taxă/maxim). `shared/shipping.computeOrderTotals` calculează server-side; checkout Stripe adaugă linia „Transport" și factura Oblio o include.
- **Fulfillment**: preluare exclusivă (`assignedTo`; a doua preluare e refuzată), checklist obligatoriu înainte de ambalare, AWB/curier manual opțional, fără integrare curier/notificări. Admin poate realoca (eveniment cu from/to). Toate acțiunile au `requestId` reluat din `orderEvents`.
- **Anulare** (`orders.cancel`, Admin, motiv obligatoriu): neplătită → fără stoc (o plată Stripe ulterioară intră pe calea existentă `needs_review(cancelled)`); plătită și neexpediată → restocare o singură dată în Atelier din `inventoryAppliedItems` (`online_cancel`), `inventoryStatus: released`, `refundStatus: manual_required` (rambursarea se face manual în Stripe); comenzi vechi fără `inventoryAppliedItems` → fără restocare, cu notă; `cancelled + needs_review` → doar eliberează rezervarea; expediată/livrată → refuzat. `markOrderPaid` tratează `released` ca deja procesat (un webhook reluat nu mai reține stoc).
- **Checkout**: singura schimbare — `createPendingOrder` salvează snapshot-ul de livrare (`shipping`); comenzile vechi folosesc adresa clientului (etichetat în UI).
- Acces: `fairAssignments` (Seller ↔ târg; indexuri `by_user`, `by_fair`, `by_fair_user`).
- Operațiuni de stoc (2026-10-22, aditiv, fără migrare de date): `stockMovements.kind` + `receipt|adjustment|count`, `reason` + `production|damaged|lost|found|correction|other|count`, câmpuri `note`, `stockOperationId`, indexuri `by_location_fair`, `by_product_location`; tabel `stockOperations` (chitanță idempotentă, `by_request`). Separat de `inventoryOperations` deoarece acela cere `fairId/fairName` și e legat de transfer/arhivare.
- Transferuri (aditiv): `transfers` (status `requested|draft|in_transit|partially_received|received|cancelled`, from/to Atelier sau târg, linii cu requested/planned/shipped/received; indexuri `by_status`, `by_createdBy`), `transferEvents` (istoric + idempotență, `by_request`, `by_transfer`), `stockMovements.kind` + `transfer_out|transfer_in`, câmp `transferId`. Dev: 0 transferuri la publicare.
- Lipsesc: variante de produs, prag minim per locație și închiderea auditată a unei diferențe pierdute în tranzit. AWB/curier există în fulfillment, dar rămân manual.

## 5. Regula actuală de inventar și rezervări

Logica comună: `convex/lib/inventory.utils.ts`.

- **Stoc fizic în locații** = `products.stock` (Atelier, sursa canalului online) + Σ `fairInventory.quantity`. În `pos.getStockOverview`, **totalul** include și cantitatea în tranzit (expediat minus recepționat). Nu crea un al treilea pool „atelier” și nu confunda stocul fizic cu disponibilul după claims; chitanțele vechi `stockSummary` nu sunt o vedere globală a tranzitului.
- **Transferuri** (`convex/transfers.ts`): Solicitare (Seller) → Draft → În tranzit → Recepționat (parțial/complet). Draft și anulare (doar `requested|draft`): fără stoc. `ship`: scade sursa all-or-nothing (Atelier ≤ disponibil după rezervări; târg ≤ sold și fără POS `prepared`), `transfer_out`; destinația nu crește. `receive`: adaugă doar cantitatea primită (≤ rest în tranzit), `transfer_in`; restul rămâne în tranzit (`partially_received`). Sursă ≠ destinație; târguri active. Fiecare acțiune are `requestId`, reluat din `transferEvents` înaintea verificărilor de stare. Transferurile/evenimentele nu se șterg. `getStockOverview` expune `inTransitStock` și îl include în `totalStock`. Arhivarea unui târg e blocată de transferuri deschise.
- **Transferul direct vechi** (`pos.transfer` → `transferInventory`) nu mai acceptă operațiuni noi; doar reia chitanțe existente (recuperare checkpoint `useInventoryOperation`). `StockTransferDialog` a fost șters; butonul „Transfer” din Stocuri deschide `/admin/transfers/new?productId=…&from=…`.
- **Arhivare târg** (`pos.archiveFair`): returnează stocul rămas online atomic, după preview confirmat; blocată de plăți POS nerezolvate.
- **POS**: `prepare` creează intenția (un singur `prepared` per vânzător); `complete` re-validează prețuri și stocul la târg (`buildSale` din `convex/lib/pos.utils.ts`), scade `fairInventory`, scrie `stockMovements kind:"sale"`; idempotent prin `posSales.by_request`. Card = aprobare pe terminal separat.
- **Checkout online** (`checkout.createCheckoutSession`): **nu rezervă stoc**. Verifică doar disponibilitatea (`checkoutSnapshot` → `onlineDeductions`) și creează comanda `pending` + sesiune Stripe. Comenzile `pending` nu blochează stoc; sesiunile expirate nu sunt tratate (rămân `pending`).
- **Scădere online**: doar la webhook `checkout.session.completed` → `orders.markOrderPaid` (idempotent: `paymentConfirmedAt`/`inventoryStatus`). Stoc suficient → scade `products.stock`, `stockMovements kind:"online_sale"`, `inventoryStatus:"applied"`, programează post-plata o singură dată. Lipsă de stoc → alocare parțială + `needs_review`. Plătită după anulare → `needs_review` (`cancelled`), fără scădere.
- **„Rezervare” efectivă** = cantitățile nealocate din comenzile plătite `needs_review` (`onlineReviewClaims`); acestea scad stocul online disponibil în catalog, transferuri și POS overview. Reconciliere: `orders.reconcileStock` (permisiune `inventory.reconcile`: Admin/Atelier). Expedierea (`shipped/delivered`) este blocată până la `applied`.
- **Locații fizice**: Atelier = `products.stock` (audit `workshop`) și fiecare târg = `fairInventory`. Online este canalul care vinde din Atelier: Atelier fizic / rezervat / disponibil = `onlinePhysicalStock` / `onlineHeldOrders` / `onlineStock`. Târguri: rezervat 0 (POS `prepare` nu rezervă), disponibil = fizic.
- **Operațiuni de stoc** (`convex/inventory.ts`, permisiune `inventory.adjust`): `receive` (doar Atelier, +cant.), `adjust` (±, motiv + notă 3–500 obligatorie), `count` (așteptat/numărat/diferență), `setLowStockThreshold`. Fiecare scrie atomic stoc + `stockMovements` + `stockOperations`; idempotente pe `requestId` (replay verificat înaintea oricărei validări). Fără stoc negativ; scăderea în Atelier nu poate coborî sub cantitatea rezervată; scăderea/inventarierea la târg e blocată de o încercare POS `prepared` pentru produs.
- **Inventariere fără suprascriere veche**: `countSnapshot` dă `expectedQuantity` + `lastMovementId`; `count` refuză dacă soldul sau ultima mișcare pentru produs+locație s-au schimbat („Revalidează numărătoarea”). Atelier caută ultima mișcare după prefix `productId+workshop` (rândurile de transfer/arhivare au `fairId`) — verificat pe dev prin MCP (index = scanare completă).
- **Prag minim**: `products.lowStockThreshold` (implicit 5, folosit și de magazin pe disponibilul online). În Stocuri „stoc scăzut” = disponibil Atelier ≤ prag.
- **Editarea directă a stocului a fost eliminată**: `updateProduct({stock})` și `createProduct({stock≠0})` aruncă eroare; `products.updateStock` șters; `ProductForm` arată stocul read-only cu link către Stocuri. Rămân în afara auditului: `seedProducts` (admin, seeding) și `decrementStock` (internal, nefolosit).

### Rapoarte și Panou — definiții indicatori (`convex/lib/reports.utils.ts`, `convex/reports.ts`)

Calcul server-side pe întregul set filtrat (nu pe pagină); browserul primește doar agregate. Fus orar Europe/Bucharest: datele sunt `YYYY-MM-DD` prin `businessDate()` (aceeași funcție ca POS), perioadă inclusivă, max. 366 zile. Bani în bani-întregi (`toCents` pe snapshot-ul de preț). Nicio valoare nu este „profit”; fără comparații procentuale. Peste 10000 comenzi/vânzări POS → eroare explicită, fără trunchiere.

| Indicator | Înregistrări incluse | Data folosită | Anulări / retururi | Natură |
|---|---|---|---|---|
| Vânzări online brute / reduceri / net | comenzi cu `paymentStatus = paid` (confirmate Stripe sau stare veche `paid/shipped/delivered`); brut = Σ preț snapshot × cant.; reducere = max(0, brut − `total`) | `paymentConfirmedAt ?? createdAt` | net = brut − reduceri − anulări după plată | vânzări |
| Anulări după plată („retururi” online) | comenzi plătite cu `status = cancelled` (inclusiv plătite după anulare) | max(`cancelledAt`, data vânzării) | scad netul perioadei anulării (netul poate fi negativ) | vânzări (corecție) |
| Vânzări POS brute / reduceri / net | `posSales` (doar vânzări finalizate) — `subtotalCents` / `discountCents` / `totalCents` | `businessDate` | POS nu are flux de retur (`posReturnsTracked: false`); încercările anulate nu sunt vânzări | vânzări |
| POS pe târg | aceleași `posSales`, grupate pe `fairId` (inclusiv arhivate) | `businessDate` | idem | vânzări + încasări numerar/card |
| Încasări POS numerar / card | `totalCents` după `paymentMethod` (singurele metode reale: cash, card pe terminal separat) | `businessDate` | — | încasări |
| Încasări online confirmate | Σ `total` al comenzilor cu `paymentConfirmedAt` (webhook Stripe) | `paymentConfirmedAt` | rămân încasate și după anulare (rambursarea nu e integrată) | încasări |
| Online neconfirmat (stare veche) | comenzi considerate plătite fără `paymentConfirmedAt` | `createdAt` | — | **nu** e încasare; afișat separat |
| Rambursări manuale | comenzi cu `refundStatus = manual_required` | data anulării | informativ, nu se scad din încasări | rambursări de efectuat |
| Comenzi pe stări | toate comenzile (plată: pending/paid/cancelled cu valoare; fulfillment: cele 7 stări) | `createdAt` | anulatele apar ca stare | comenzi |
| Produse vândute | articole online vândute − returnate + articole POS; valoare brută (înainte de reduceri la nivel de comandă) | ca la vânzări / retururi | unitățile returnate se scad | vânzări (cantități) |
| Vânzări pe zile | net online + net POS pe fiecare zi a perioadei | ca mai sus | ca mai sus | vânzări |
| Comenzi de pregătit | `fulfillmentState` `ready/preparing/packed` (aceeași regulă ca `fulfillment.queue`) | stare curentă | anulatele/neplătitele excluse | comenzi |
| Stoc redus | produse active cu `trackStock`, disponibil Atelier (`stock − rezervat needs_review`) ≤ `lowStockThreshold ?? 5`; stoc invalid → marcat „Stoc invalid”, nu 0 | stare curentă | — | stoc |
| Transferuri în tranzit | `in_transit` + `partially_received`, unități = expediat − recepționat (pe toate, listă top 10) | stare curentă | anulatele nu apar | stoc |
| Excepții nerezolvate | comenzi `needs_review`; balanțe de târg de reconciliat (aceeași regulă ca `getStockOverview.issues`); POS `prepared` (doar Admin, prin `by_fair_status`) | stare curentă | — | operațional |

Filtre Rapoarte: perioadă, canal (Toate/Online/POS), târg (implică POS). Canal exclus → secțiunile și câmpurile de încasări ale acelui canal sunt `null` („—”), nu 0. Export CSV per tabel cu toate rândurile filtrate: celule între ghilimele, `"` dublat, prefix `'` pentru celule text care încep cu `= + - @ \t \r`, CRLF, BOM UTF-8. Grafic: bare CSS simple (nu există bibliotecă de grafice; nu s-a adăugat). `pos.dailySummary`, `reports.summary.posByFair` și `reports.dashboard` folosesc același `posTotals`.

Dev (MCP, 2026-10-26, doar numărători): 13 comenzi, 0 cu `paymentConfirmedAt`, 7 plătite în stare veche → în dev încasările online confirmate sunt 0 și cele 7 apar ca „neconfirmate”; 5 vânzări POS; 0 POS `prepared`; 0 transferuri deschise; 0 `needs_review`.

## 6. Componente și hook-uri reutilizabile

- `AdminLayout` (sidebar responsive), `AdminRoute`, `AdminDialog` (wrapper peste `Dialog` din `src/components/ui/` — Radix; `title`, `locked`, `onClose`; `locked` blochează Escape/outside-click și dezactivează butonul de închidere), notificări prin `sonner` (`Toaster` montat în `App` sub `<Router>`), `SearchableSelect`.
- `useAdminQuery` (query cu eroare în română în loc de throw), `useInventoryOperation` (checkpoint local + reluare `requestId`), `InventoryFeedback`, `useTransferAction` (checkpoint `hawaii:transfers:action:v1:{actorId}`), `src/utils/inventory.utils.ts`, `src/types/inventory.types.ts`.
- Stocuri: `useStockOperation` (checkpoint local `hawaii:inventory:stock-op:v1:{actorId}`, retry cu același `requestId`), `StockOperationDialog`, `StockOperationFeedback`, `StockMovementsHistory` (`usePaginatedQuery`), `AssignedFairStock` (Seller), `locationStock`/`filterStockRows` în `src/utils/inventory.utils.ts`.
- POS: `usePosPayment`, `OrderPanel`, `ProductPicker`, `PaymentDialog`, `pos.utils.ts` (bani).
- Temă: Tailwind `stone`/`amber`, sidebar `bg-stone-900`. Dark mode există (`darkMode: 'class'`, `useTheme`, `ThemeToggle`, clase `dark:`).
- Limba: interfața de backoffice este în principal în română; unele nume de fișiere, stări și termeni tehnici rămân în engleză.

## 7. Comenzi de testare

Comenzile curente sunt în [ghidul de testare](agent-instructions/testing.md). Rezultatele datate de mai jos sunt istorice, nu starea actuală a suitei.

| Scop | Comandă |
|---|---|
| Unit/backend (Node 22, dublu tranzacțional Convex) | `npm run test:unit` |
| UI (React Testing Library + jsdom) | `npm run test:ui` |
| Toate | `npm test` |
| Typecheck frontend | `./node_modules/.bin/tsc -p tsconfig.app.json --noEmit` |
| Typecheck backend/shared | `./node_modules/.bin/tsc -p convex/tsconfig.json --noEmit` |
| Config TS | `node --test tests/typescript-config.test.mjs` |
| Lint | `npm run lint` |
| Build TEST | `npm run build:test` |
| Mediu local | `npm run check:env` |
| Sync backend TEST | `npm run test:sync` (operațiune remote ghidată; nu este validare locală) |

Fixture backend: `tests/helpers/convexFixture.mjs`; fixture UI: `tests/ui/fixtures.ts`, `tests/ui/setup.mjs`. Teste existente: `pos*`, `fairs-backend`, `inventory-backend`, `orders-stock`, UI pentru POS, Fairs, Inventory, Transfers, OrderInventoryReview.

Baseline 2026-10-22 (Node v22.22.0): `test:unit` 68/68, `test:ui` 33/33, ambele `tsc` OK, `vite build` OK. `npm run lint`: 4 erori preexistente `no-explicit-any` (`convex/lib/translations.ts`, `useTranslatedCategories.ts`, `useTranslatedProducts.ts`) + 7 warnings; nu sunt regresii.

După roluri (2026-10-22): `test:unit` 75/75, `test:ui` 41/41, `tsc` OK, `vite build` OK, lint identic cu baseline. Teste noi: `tests/authorization-backend.test.mjs` (parseRole, matrice 17 funcții × 6 identități, locații, escaladare, redactare Atelier, regresie POS Admin/Seller) și `tests/ui/StaffAccess.test.tsx` (rute/meniu per rol, stoc Seller, POS Seller, FairSellers). Typecheck backend extins: adaugă `convex/staff.ts convex/orders.ts convex/customers.ts` la comanda de mai sus. Dev sincronizat (`convex dev --once`); verificat prin MCP `run` fără identitate: `staff:me` → `null`, `pos:getStockOverview` și `seedCategories` → „Unauthorized”, `customers:getByClerkUserId` → `null`.

După Stocuri (2026-10-22): `test:unit` 87/87, `test:ui` 48/48, `tsc` OK (backend strict + `convex/inventory.ts convex/products.ts`), `vite build` OK, lint identic cu baseline. Teste noi: `tests/stock-operations-backend.test.mjs` (intrare, ajustare, rezervări, retry, conflict inventariere vs. POS/transfer, istoric paginat, acces Seller, blocarea stocului din produs) și `tests/ui/StockOperations.test.tsx` (filtre, dublu click, retry cu același `requestId`, notă obligatorie, conflict + revalidare, Seller fără operațiuni, ProductForm fără stoc). Fixture: `paginate` + `_creationTime` determinist. Dev sincronizat; MCP fără identitate: `inventory:movements` → „Unauthorized”.

După Transferuri (2026-10-22): `test:unit` 101/101, `test:ui` 52/52, `tsc` OK (backend strict + `convex/transfers.ts`), `vite build` OK, lint identic cu baseline. Teste noi: `tests/transfers-backend.test.mjs` (flux complet, parțial, supra-recepție, târg↔târg↔Atelier, rezervări, POS în curs, retry, anulare, permisiuni, arhivare blocată, reluare `pos.transfer`, conflict inventariere) și `tests/ui/Transfers.test.tsx`. Testele vechi care creau transferuri directe au fost mutate pe noul flux. Dev sincronizat; MCP fără identitate: `transfers:list` → „Unauthorized”.

După Catalog/Târguri (2026-10-22): `test:unit` 116/116, `test:ui` 59/59, `tsc` OK (backend strict + `products/categories`), `vite build` OK, lint identic cu baseline. Teste noi: `tests/catalog-fairs-backend.test.mjs` (editare/SKU/permisiuni, reflectare în POS, dezactivare/arhivare/ștergere, snapshot-uri neschimbate, categorii, perioadă târg, asociere târg–locație după transfer) și `tests/ui/CatalogFairs.test.tsx`. Dev: 4 produse, toate active (câmp lipsă), 2 târguri fără perioadă → magazinul nu se schimbă; MCP fără identitate: `products:listAdmin` → „Unauthorized”.

După Comenzi/Fulfillment (2026-10-22): `test:unit` 127/127, `test:ui` 67/67, `tsc` OK (backend strict + `fulfillment/orders/checkout`), `vite build` OK, lint identic cu baseline. Teste noi: `tests/fulfillment-backend.test.mjs` (anulare/restocare unică/plată după anulare, rezervări, preluare concurentă, comenzi neplătite, tranziții, acces + redactare, retry, regresie checkout/POS) și `tests/ui/OrdersFulfillment.test.tsx`. Dev sincronizat; MCP fără identitate: `fulfillment:queue` → „Unauthorized”; 7 comenzi vechi plătite sunt eligibile pentru pregătire.

După Rapoarte/Panou (2026-10-26, branch `feat/reports-dashboard` din `main` @ `541a0a1`): `test:unit` 142/145 (cele 3 eșecuri sunt preexistente pe `main`: randări statice `PaymentDialog` în `tests/pos-ui.test.mjs` fără ConvexProvider), `test:ui` 99/99, `tsc` app + backend strict (`reports`, `reports.utils`, `pos`, `transfers`, `schema`) OK, lint 0 erori / 11 warnings, `vite build` OK. Teste noi: `tests/reports-backend.test.mjs` (fixture cu online, POS pe două târguri, anulare, retur, plată după anulare, comandă veche, limita de fus orar 21:30 UTC → ziua următoare; filtre; concordanță Rapoarte ↔ Panou ↔ `pos.dailySummary` ↔ `fulfillment.queue` ↔ `getStockOverview` ↔ `transfers.list`; acces pe roluri; validare) și `tests/ui/Reports.test.tsx`. Fixture-ul backend suportă `gte/lte` în index. Dev sincronizat; MCP fără identitate: `reports:summary` și `reports:dashboard` → „Unauthorized”.

Integrare (2026-10-26, același branch): `test:unit` 146/146, `test:ui` 99/99, `tsc` app + backend strict OK, lint 0 erori / 11 warnings, `vite build` OK, dev sincronizat.
- Test nou `tests/e2e-integration.test.mjs` (fixture, funcții reale, identități comutate): intrare Atelier → transfer creat/expediat → recepție parțială + completă la târg → Seller vede doar târgul alocat și vinde în POS → solicitare reaprovizionare (refuzată pentru târg nealocat) văzută de Atelier → comandă online (snapshot livrare, webhook dublu = o singură scădere) pregătită/ambalată/expediată cu AWB manual/livrată → anulare plătită (restocare unică; replay fără efect; ID nou refuzat) + ajustare cu motiv → audit: fără stoc negativ, Σ mișcări = sold pe fiecare produs×locație → replay al tuturor mutațiilor fără rânduri noi → vânzarea POS absentă din fulfillment → Rapoarte/Panou/`dailySummary` concordante → conflicte (inventariere vs. POS/transfer, POS în curs blochează expediere/ajustare, dublă preluare) → acces anonim/client refuzat pe fiecare modul. Rulează în dublul tranzacțional, nu în browser și nu cu utilizatori Clerk reali.
- Defecte corectate: (1) `fulfillment.get` trimitea prețuri și total către Atelier → acum doar cu `orders.manage`; `PackingSlip` ascunde coloanele de bani când lipsesc. (2) 3 teste `pos-ui.test.mjs` picau din migrarea shadcn (`PaymentDialog` → `useProductThumbnails` → Convex): `test:unit` primește `--experimental-test-module-mocks` (doar script, fără versiuni) + mock în test.
- Dev prin MCP `runOneoffQuery` (doar numărători): 0 stoc invalid/negativ, 0 balanțe orfane sau duplicate târg×produs, 0 `requestId` duplicate (`posSales`, `posAttempts`, `stockOperations`, `inventoryOperations`, `transferEvents`, `orderEvents`), 0 încercări `completed` fără vânzare, 0 vânzări fără mișcare, ultimul `balanceAfter` = soldul curent pe toate locațiile, 0 `prepared`, 0 transferuri deschise.
- Temă: paginile admin noi au variante `dark:`; `PackingSlip` rămâne alb intenționat (document de imprimat).
- Tabletă: capturi Chrome headless 1024×768 și 768×1024 doar pentru `/` și `/products` (randare corectă, temă întunecată). `/admin/login` rămâne la „Se încarcă…” în headless (Clerk) → **paginile admin nu au fost verificate vizual pe tabletă**; doar revizuire statică a claselor responsive (tabele în `overflow-auto`, filtre în grid, dialoguri cu lățime limitată).

Deploy (2026-10-26): commit `fb3dab9` pe `main` (push la GitHub), `convex deploy` pe producția `upbeat-lyrebird-218` — reușit, fără indexuri șterse. MCP `functionSpec`: prod = dev, 113 funcții identice, inclusiv `reports:summary`/`reports:dashboard`. Frontend-ul Vercel nu a fost republicat manual (depinde de integrarea Vercel↔GitHub). Variabilele de mediu din prod nu se pot citi prin MCP (read-only) — verificare manuală în dashboard. Avertisment la deploy: proiectul depășește limitele planului gratuit (dashboard.convex.dev/t/robert-raulea).

## 8. Starea modulelor

| Modul | Stare actuală | Ce lipsește |
|---|---|---|
| Vânzări la târg (`/admin/pos`) | Completă: POS idempotent, cash/card, discount, recuperare plăți, sumar zilnic; Admin + Seller (doar târguri alocate) | — |
| Târguri (`/admin/fairs`) | Completă: creare/editare cu perioadă, stare derivată, locație de inventar proprie, linkuri POS/Stoc/Transferuri/Transfer nou, alocare vânzători după email/ID Clerk, arhivare atomică | Selectare după nume (nu există) |
| Stocuri (`/admin/inventory`) | Completă: căutare nume/SKU, filtre locație/categorie/disponibilitate, fizic/rezervat/disponibil/prag, istoric paginat; Admin/Atelier: intrare, ajustare, inventariere, prag; coloană „În tranzit”; Seller read-only pe târgurile alocate | Variante (nu există în schemă); prag per locație |
| Transferuri (`/admin/transfers`) | Completă: listă + filtre stare/locație, detalii, mai multe produse, note, istoric; Seller: solicitări proprii | Închiderea diferenței pierdute în tranzit; paginare (listă limitată la 200 recente) |
| Products | Completă: căutare nume/SKU, filtre categorie/stare, paginare 20/pagină, SKU, imagini, preț, activ/inactiv, arhivare/restaurare, ștergere doar fără istoric, stoc informativ cu link la Stocuri (doar Admin) | Variante (nu există în schemă) |
| Categories | Completă: CRUD admin, număr produse, redenumire/ștergere blocate pentru categorii folosite | — |
| La comandă | Completă: galerie `siteAssets` editabilă (titlu, preț, descriere, imagine) | Nu e flux de comenzi la comandă, doar vitrină |
| Comenzi (Admin) | Completă: listă paginată 25/pagină (max. 1000 recente), căutare număr/client/email/sesiune Stripe, filtre perioadă/plată/fulfillment, detalii cu snapshot preț și totaluri, livrare, notițe, istoric, factură existentă, anulare controlată, realocare | Paginare server-side peste 1000 comenzi |
| Customers | Completă: listă, detaliu, editare, newsletter (admin), ștergere blocată pentru clienți cu comenzi | — |
| Roluri Seller/Atelier | Completă: matrice, rute, meniu, alocări, redactare | Rolurile autoritative se setează manual în Clerk |
| Reaprovizionare | Completă ca solicitare de transfer (`requested`) | — |
| Panou (`/admin/dashboard`) | Completă: Admin — Azi/Luna curentă (vânzări separat de încasări), comenzi de pregătit, stoc redus, transferuri în tranzit, excepții, linkuri cu filtre; Atelier — operațional fără bani; Seller — POS azi pe târgurile alocate + solicitările proprii în tranzit | — |
| Rapoarte (`/admin/reports`) | Completă (Admin): filtre perioadă/canal/târg, sumar vânzări, încasări, comenzi pe stări, POS pe târg, produse vândute, vânzări pe zile, CSV per tabel | Retururi POS (nu există flux); rambursări confirmate (nu există integrare) |
| Fulfillment | Completă: coadă (De pregătit/În pregătire/Ambalate/Expediate recent), preluare, checklist, notițe, ambalare, expediere cu AWB manual, livrare, listă imprimabilă, secțiune separată de solicitări de reaprovizionare | Integrare curier (intenționat absentă) |

## 9. Riscuri și limite cunoscute

- Rolurile `seller`/`atelier` se setează manual în Clerk Public metadata; `staffDirectory.role` este doar pentru afișare/selecție. Configurația JWT template (`role`, `email`, `email_verified`) trebuie verificată în dashboard-ul Clerk țintă.
- Checkout-ul nu rezervă stoc; supravânzarea online intră pe `needs_review`. Comportamentul este intenționat și nu trebuie reconstruit fără cerință explicită.
- Rambursările nu sunt integrate: `refundStatus: manual_required` înseamnă acțiune manuală în Stripe, nu confirmare automată.
- O diferență pierdută în tranzit poate rămâne `partially_received`; nu există încă închidere auditată.
- Rapoartele citesc setul filtrat la fiecare apel și au limita explicită de 10000 de comenzi/vânzări POS; la volum mare vor fi necesare agregate incrementale. Filtrul „stoc scăzut” din Stocuri include și produse inactive/arhivate, Panoul doar active, deci numărătorii pot diferi.
- Nu există workflow CI în checkout; validarea rămâne locală/manuală.
- Fixturele și jsdom nu dovedesc concurența OCC reală, comportamentul browserului pe tabletă, fluxul Clerk autentificat, webhook-ul Stripe real, Oblio/Resend sau integrarea curierului.
- Pentru pregătirea producției folosește `docs/environments.md`. Notele datate din secțiunile anterioare despre merge, deploy și starea dev/prod sunt istorice, nu starea curentă.

## 10. Reguli comune pentru etapele următoare

### A. Reutilizare și siguranță
- Păstrează tema și componentele existente, inclusiv light/dark mode (`useTheme`, `ThemeToggle`, tokenii `.dark`). `PackingSlip` rămâne intenționat alb pentru imprimare.
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
- Pentru inspecții pe deployment, confirmă întâi ținta și autorizarea conform `docs/environments.md`; folosește MCP/CLI doar când verificarea remote este necesară. Inspecția codului și testele locale nu cer publicarea funcțiilor.
- Refolosește informația verificată în sarcina curentă, dar nu trata snapshot-urile datate din acest document ca stare live a backend-ului.
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
