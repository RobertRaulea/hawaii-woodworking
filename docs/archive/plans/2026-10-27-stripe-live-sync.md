# Stripe Live + Sync Implementation Plan

**Goal:** Comutare de la Stripe test → live în producție + sincronizare automată Convex→Stripe pentru clienți și produse.

**Architecture:**
- Convex **dev** deployment → un singur **sandbox Stripe** (sk_test)
- Convex **prod** deployment → **contul Stripe LIVE** (sk_live) — bani reali
- Un nou fișier `convex/stripeSync.ts` cu internal actions idempotente care creează/actualizează clienți și produse în Stripe, declanșate din mutațiile existente (`saveCustomer`, `createProduct`, `updateProduct`, `archiveProduct`, `deleteProduct`) și dintr-un hook de login în frontend.

**Corecție conceptuală importantă:** în Stripe NU există "sandbox de producție". Sandbox-urile nu procesează NICIODATĂ bani reali. Producția = contul live (cel selectat din account picker, în afara listei "Sandboxes"). Setup-ul corect este: dev↔sandbox, prod↔live.

**Tech Stack:** Stripe Node SDK (deja instalat), Convex actions/scheduler (deja folosite în `checkout.ts`).

---

## Stare actuală (verificat)

| Componentă | Stare |
|---|---|
| Convex dev `STRIPE_SECRET_KEY` | `sk_test_…` (sandbox) |
| Convex prod `STRIPE_SECRET_KEY` | `sk_test_…` (sandbox) — **site-ul live ia bani de test** |
| Convex prod `STRIPE_WEBHOOK_SECRET` | **lipsește** — webhook-ul ar eșua în prod |
| Stripe account `acct_1RYnhxEsAVqCgTxX` | `charges_enabled: true`, `payouts_enabled: false`, `details_submitted: true` |
| Sandbox-uri existente | "Test mode" (default) + "Hawaii Wood Working S…" — fiecare cu propriile chei `sk_test` |
| `stripeCustomerId` stocate în prod | create în sandbox → **invalide în live** (bug la comutare) |
| Schema | `products.stripe_product_id`, `stripe_price_id`, `customers.stripeCustomerId` există deja |
| Webhook route | `POST /stripe-webhook` în `convex/http.ts` |

## Limitări Stripe (ce NU se poate prin API/MCP)

- Crearea sandbox-urilor — doar din Dashboard (dar avem deja 2, nu mai trebuie)
- Obținerea cheilor secrete (`sk_live_`, `sk_test_`) — se copiază manual o singură dată din Dashboard

---

## Decizii luate (2026-10-27)

1. **Sandbox dev:** se păstrează **"Test mode"** (cel default). ATENȚIE: sandbox-ul "Test mode" are chei `sk_test_51RYnhx…` DIFERITE de cele din sandbox-ul "Hawaii Wood Working S…" (`sk_test_51RYni…`) — cheia de test actuală din Convex va trebui înlocuită cu cea din "Test mode". Datele de test nu se transferă între sandbox-uri, dar `syncCustomer` re-creează automat la 404.
2. **Sync clienți:** doar la primul checkout (comportamentul actual rafinat cu validate-or-recreate; fără hook de login).
3. **Produse șterse:** `products.del` — ștergere completă din Stripe.
4. **Cheile:** utilizatorul le setează singur cu comenzile de mai jos. Webhook secrets (`whsec_…`) le generez și le setez EU prin MCP + `convex env set` — nu necesită acțiunea lui.

## Faza 0 — Pași manuali în Stripe Dashboard (utilizator, ~10 min)

1. **Sandbox "Test mode"** rămâne mediul de dev. Sandbox-ul "Hawaii Wood Working S…" poate fi șters sau lăsat nefolosit (opțional).
2. **Copiază `sk_test_…` din sandbox-ul "Test mode"** — account picker → Test mode → Developers → API keys → Secret key → Reveal. (Cheia începe cu `sk_test_51RYnhx…`)
3. **Comută pe contul live** — account picker → **Hawaii Wood Working Sibiu** (NU din secțiunea "Sandboxes") → Developers → API keys → copiază `sk_live_…`.
4. **Rezolvă payouts** — bannerul roșu "Payouts paused" → View task → completează datele bancare/documente. Nu blochează go-live, dar banii nu se virează fără asta.
5. **Setezi cheile** cu comenzile de la Faza 1, pasul 3 — dar NU înainte de deploy-ul codului (vezi nota despre bug).

## Faza 1 — Configurare medii (eu, prin MCP + Convex CLI)

**Files:** niciun fișier — doar env vars + webhook endpoints.

1. Aflu URL-ul site-ului de prod Convex: `npx convex env list --prod` / dashboard → `.convex.site` domain (ex: `https://<nume>.convex.site/stripe-webhook`).
2. **Webhook live** (eu, MCP `stripe-live` → `stripe_api_write` → `PostWebhookEndpoints`):
   - `url`: `https://<prod-deployment>.convex.site/stripe-webhook`
   - `enabled_events`: `["checkout.session.completed"]`
   - Response-ul conține `secret` (`whsec_…`) → îl setez eu: `npx convex env set STRIPE_WEBHOOK_SECRET whsec_… --prod`
3. **Webhook dev** (eu, MCP `stripe-test` în sandbox-ul "Test mode" — cheia MCP `rk_test_51RYnhx…` confirmă că aparține acestui sandbox):
   - `url`: `https://<dev-deployment>.convex.site/stripe-webhook`
   - aceleași events → `whsec_…` → `npx convex env set STRIPE_WEBHOOK_SECRET whsec_…` (dev)
4. **Cheile API — le setezi TU** (după deploy-ul codului din Faza 2!):
   ```bash
   # DEV — cheia din sandbox-ul "Test mode" (sk_test_51RYnhx…):
   npx convex env set STRIPE_SECRET_KEY sk_test_51RYnhx…

   # PROD — cheia live din contul principal (sk_live_…):
   npx convex env set STRIPE_SECRET_KEY sk_live_… --prod
   ```
5. Verific: `npx convex env list --prod` arată `sk_live_` + `whsec_`; `npx convex env list` arată `sk_test_` + `whsec_`.
6. **În acel moment site-ul ia bani reali.**

> **Bug cunoscut la comutare:** clienții din prod cu `stripeCustomerId` de test vor cauza `No such customer` la checkout. Faza 2 include fix automat (validate-or-recreate), deci ideal comutăm cheia ABIA după deploy-ul codului. Secvența sigură: deploy cod (Faza 2) cu chei de test → apoi comutăm cheile live.

## Faza 2 — Sincronizare automată Convex → Stripe (cod)

### Task 1: `convex/stripeSync.ts` (fișier nou, `"use node"`)

Internal actions, toate idempotente:

- `syncCustomer({ customerId })`:
  - citește customer-ul din DB; dacă `stripeCustomerId` există → `stripe.customers.retrieve(id)`
    - 404 / "No such customer" → șterge ID-ul vechi și continuă (repară automat ID-urile de test la comutarea pe live!)
    - există → `stripe.customers.update` cu datele curente (nume/email/adresă) → gata
  - altfel: `customers.list({email, limit:1})` → re-folosește sau `customers.create` (email, name, address, `metadata: { convexCustomerId, clerkUserId?, source }`)
  - salvează ID via `internal.customers.setStripeCustomerId`
- `syncProduct({ productId })`:
  - produs lipsă/arhivat → `products.update(active:false)` în Stripe dacă avem `stripe_product_id` → gata
  - `stripe_product_id` există → `products.retrieve` (404 → recreate ca mai jos), apoi `products.update` cu name/description/images/metadata sku
  - compară `stripe_price_id` → `prices.retrieve` → dacă `unit_amount` ≠ prețul curent ×100 → `prices.create` nou + `prices.update(old, {active:false})` (prețurile Stripe sunt imuabile)
  - altfel: `products.create` + `prices.create` (currency `ron`, `unit_amount: Math.round(price*100)`, `metadata: { convexProductId, sku }`)
  - salvează ambele ID-uri printr-un nou `internalMutation` `setStripeIdsInternal` în `products.ts` (varianta internă a `setStripeIds` existent, fără `requireAdmin`)
- `syncAllProducts` / `syncAllCustomers` (internal actions pentru backfill, rulabile din dashboard/CLI o singură dată)

### Task 2: Hooks în mutații existente

- `convex/customers.ts` — la finalul `saveCustomer` (după insert/patch):
  `await ctx.scheduler.runAfter(0, internal.stripeSync.syncCustomer, { customerId: id })`
- `convex/products.ts` — la final de `createProduct`, `updateProduct`, `archiveProduct`, `restoreProduct`:
  `ctx.scheduler.runAfter(0, internal.stripeSync.syncProduct, { productId: id })`
- `convex/products.ts` — în `deleteProduct` (decizie: ștergere completă):
  `ctx.scheduler.runAfter(0, internal.stripeSync.deleteProductFromStripe, { stripeProductId })` → `products.del` (cu try/catch la 404 — produsul poate lipsi în Stripe)
- `convex/checkout.ts` — refactor blocul "1b":
  - înlocuiește `getStripeCustomerId` + `customers.list/create` cu apel la `internal.stripeSync.syncCustomer` care întoarce `stripeCustomerId` validat (logica de retrieve/404-recreate centralizată acolo)
  - în `line_items`: dacă `product.stripe_price_id` există în snapshot → `{ price: stripePriceId, quantity }`; altfel fallback la `price_data` actual (robust pt. produse nesincronizate încă)

### Task 3: Teste

- `tests/` — extind suite-ul existent de unit tests pentru backend (transactional DB double):
  - `syncCustomer` creează ID nou, re-folosește la al doilea apel, re-creează la 404
  - `syncProduct` setează ambele ID-uri, creează price nou la schimbare de preț
  - `createCheckoutSession` folosește `stripe_price_id` când e prezent
- Rulează: `npm run test:unit`, `npm run test:ui`, `./node_modules/.bin/tsc -p tsconfig.app.json --noEmit`, `npm run lint`

## Faza 3 — Deploy & verificare

1. `npx convex dev --once` (dev, cu chei de test ale sandbox-ului ales)
2. Test dev end-to-end: comandă cu `4242 4242 4242 4242` → în sandbox Stripe apar: customer, products/prices, PaymentIntent, și webhook-ul marchează comanda `paid` + `inventoryStatus`
3. `npx convex deploy` (cod → prod, încă cu chei de test — sigur)
4. Backfill prod: rulez `syncAllProducts` + `syncAllCustomers` din dashboard/CLI — obiectele se creează în sandbox… **STOP** — backfill-ul trebuie rulat DUPĂ comutarea cheii live, altfel scrie ID-uri de test în baza de prod. Secvența corectă:
   1. Deploy cod pe prod (chei încă de test — checkout merge, sync-ul scrie în sandbox, OK temporar)
   2. Curăț `stripeCustomerId`/`stripe_product_id`/`stripe_price_id` din prod (mutation de curățare one-shot)
   3. Comut `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` pe live
   4. Rulez `syncAllProducts` + `syncAllCustomers` → obiectele se creează în LIVE
   5. Test final: deschid checkout-ul — fără banner "TEST MODE"; opțional: plată reală mică → refund
5. Verific în Stripe Dashboard (live): Products populate, webhook deliveries verzi în Developers → Webhooks

## Faza 4 — Post-go-live (opțional, recomandat)

- Clerk e tot în modul dev (`pk_test_`, `choice-fowl-16.clerk.accounts.dev` și pe prod) — separat, recomand trecerea la instanța Clerk de producție
- `.env` conține `sk_test_` în repo-ish local — deja în `.gitignore`; verific git history dacă a fost vreodată comis (`git log -S sk_test`)
- Alternativă mai ieftină la Stripe pentru RO (întrebarea inițială): euPLATESC/Netopia/payu au comisioane locale mai mici, dar integrarea e separată — de discutat după go-live

---

## Ordinea de execuție (critică)

1. **Eu:** scriu codul din Faza 2 (stripeSync + hooks + refactor checkout)
2. **Eu:** creez webhook-urile live + test prin MCP și setez `STRIPE_WEBHOOK_SECRET` pe ambele deployment-uri
3. **Eu:** `npx convex deploy` → cod pe prod (chei încă de test — sigur, nu se schimbă nimic pentru utilizatori)
4. **Tu:** în "Test mode" sandbox copiezi `sk_test_51RYnhx…` și rulezi `npx convex env set STRIPE_SECRET_KEY sk_test_…` (dev)
5. **Eu:** curăț `stripeCustomerId`/`stripe_product_id`/`stripe_price_id` din baza de prod (one-shot cleanup)
6. **Tu:** copiezi `sk_live_…` din contul live și rulezi `npx convex env set STRIPE_SECRET_KEY sk_live_… --prod`
7. **Eu:** rulez `syncAllProducts` + `syncAllCustomers` pe prod → obiectele apar în LIVE; verific checkout + webhook
8. **Tu:** completezi task-ul de payouts din Dashboard (pentru viramentele de bani)
