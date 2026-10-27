# Plan manual post-audit de securitate (2026-10-27)

> **STATUS (actualizat)**: Pașii 1–3 au fost executați automat: cheia Resend a fost rotită prin API (cea expusă e revocată — verificat 400/invalid), `RESEND_API_KEY` e setată pe Convex prod + dev + `.env` local, `npx convex deploy` a publicat `rateLimits` + fix-urile în prod (`upbeat-lyrebird-218`), iar `git push` a declanșat deploy Vercel cu headerele de securitate active (verificat pe `/products`). Repo-ul GitHub e **public** — cheia a fost expusă public.
>
> Rămân de făcut manual doar: Pasul 5 (verificare funcțională), Pasul 6 (CSP enforced), Pasul 7 opțional (istoric git), cheia "Onboarding" din Resend dashboard, și Dependabot toggle în repo settings.

Fix-urile de cod sunt commit-uite (`fix: remediate security audit findings` + `docs: add manual follow-up plan`).

Context de referință:
- Deployment Convex prod: `upbeat-lyrebird-218`
- Deployment Convex dev: cel din `.env.local` (`CONVEX_DEPLOYMENT`)
- Cheia Resend veche (compromisă): `re_bAXo...` (completă în `.env.example` din istoricul git)
- Cheia e folosită în `convex/postPayment.ts` → rulează în cloud Convex, deci variabila trebuie setată în **Convex Dashboard**, nu în Vercel.

---

## Pasul 1 — Rotire cheie Resend (~10 min, CRITIC)

Cheia veche a fost publică în `.env.example` + istoric git. Până o revoci, oricine o are poate trimite emailuri din numele magazinului.

1. Intră pe https://resend.com/login și autentifică-te.
2. Meniu stânga → **API Keys**.
3. Găsește cheia `re_bAXo...` → **Delete** / **Revoke**. (Dacă nu e sigur care e, șterge toate cheile vechi și creează una nouă.)
4. **Add API Key** → nume: `hawaii-prod` → Permission: **Sending access** → copiază cheia nouă (`re_...`). Atenție: se afișează o singură dată.
5. Pune cheia nouă în **Convex prod**: https://dashboard.convex.dev → proiectul `hawaii-woodworking` → selectează deployment **Production** (`upbeat-lyrebird-218`) → **Settings → Environment Variables** → `RESEND_API_KEY` = cheia nouă → Save.
6. Pune cheia nouă și în deployment-ul de **Development** (în același dashboard, selectează deployment-ul dev din dropdown) dacă `RESEND_API_KEY` există și acolo.
7. Actualizează și fișierul local `.env` (linia `RESEND_API_KEY=...`) — folosit de scripturile locale `ts-node`.
8. Verifică în Vercel: https://vercel.com → proiect → **Settings → Environment Variables** → dacă există `RESEND_API_KEY`, actualizeaz-o sau șterge-o (frontend-ul nu o citește; existența ei acolo e risc inutil).
9. **Verificare**: fă o comandă de test (sau declanșează fluxul post-plată în dev) și urmărește `npx convex logs` — nu trebuie să apară `Missing Resend API credentials` sau erori 401/403 de la Resend.

---

## Pasul 2 — Deploy backend Convex în producție (~5 min)

Fix-urile backend (rate limiting, origin allowlist, `rateLimits` în schemă) sunt acum doar pe deployment-ul de dev. Fără acest pas, producția rulează codul vechi.

```bash
cd "/Users/robert.raulea/Personal Workspace/Hawaii Store/hawaii-woodworking"
npx convex deploy
```

- Nu folosi `--env-file` (pe CLI 1.31.6 sare peste autentificarea cu account-token).
- Confirmă când întreabă de schema change (`rateLimits` e tabel nou — aditiv, nu șterge nimic).
- **Verificare**: în dashboard → prod → **Data** trebuie să apară tabelul `rateLimits`; în **Functions** trebuie să existe `lib/rateLimit.js:checkRateLimit`.

---

## Pasul 3 — Deploy frontend Vercel

- Dacă integrarea GitHub↔Vercel e activă: `git push origin main` declanșează deploy automat. Urmărește în https://vercel.com → proiect → **Deployments** până ajunge **Ready**.
- Dacă NU e integrare automată: deploy manual din dashboard sau `npx vercel --prod`.
- Headers-urile de securitate (`vercel.json`) devin active la acest deploy.

**Verificare headers** (după deploy):
```bash
curl -sI https://www.hawaiiproducts.ro | grep -iE "x-frame|content-type|referrer|strict-transport|content-security"
```
Trebuie să vezi: `x-frame-options: DENY`, `x-content-type-options: nosniff`, `referrer-policy`, `strict-transport-security`, `content-security-policy-report-only`.

---

## Pasul 4 — `ALLOWED_ORIGINS` în Convex (doar dacă e nevoie)

Checkout-ul acceptă acum DOAR: `https://hawaiiproducts.ro`, `https://www.hawaiiproducts.ro` și `http://localhost:*`/`http://127.0.0.1:*` (dev).

Ai nevoie de pasul ăsta DOAR dacă testezi checkout real pe un preview domain (ex. `https://hawaii-git-....vercel.app`):

Dashboard Convex → deployment → **Settings → Environment Variables** →
`ALLOWED_ORIGINS` = `https://hawaii-woodworking.vercel.app` (lista exactă, separată prin virgulă, fără wildcard).

---

## Pasul 5 — Verificare funcțională post-deploy (~15 min)

1. Deschide site-ul, comută dark/light mode (scriptul e acum `/theme-init.js` — dacă tema nu se aplică, ceva e blocat).
2. Login admin pe `/admin` — Clerk trebuie să funcționeze.
3. POS: intră pe `/admin/pos`, verifică că se încarcă produsele.
4. Checkout: adaugă un produs în coș → mergi până la redirectul Stripe → verifică că `success_url`/`cancel_url` pointează la `www.hawaiiproducts.ro`.
5. **DevTools → Console** pe pagina principală + `/admin` + checkout: caută mesaje `[Report Only] Refused to ...` — acestea sunt încălcări CSP. Notează-le (vezi Pasul 6).

---

## Pasul 6 — Treci CSP din Report-Only în modul impus

Acum CSP-ul doar raportează, nu blochează. După ce Pasul 5 arată zero (sau numai) încălcări legitime:

1. Dacă apar încălcări pentru domenii legitime (ex. `clerk.<domeniu>`, un CDN de fonturi), adaugă domeniul respectiv în directiva potrivită din `vercel.json`.
2. Când e curat: în `vercel.json` redenumește cheia
   `Content-Security-Policy-Report-Only` → `Content-Security-Policy`
3. Commit + push + re-verifică Pasul 5 complet (login Clerk + checkout Stripe + POS — cele trei puncte de risc).

> Dacă după activare login-ul Clerk sau checkout-ul se rupe: revino instant la `Report-Only`, redeploy, investighează domeniul blocat din Console.

---

## Pasul 7 — Curățare istoric git (opțional, distructiv)

Cheia rotită e moartă, deci ăsta e doar igienă — dar istoricul conține încă cheia veche.

```bash
pip install git-filter-repo        # sau: brew install git-filter-repo
cd "/Users/robert.raulea/Personal Workspace/Hawaii Store/hawaii-woodworking"
git filter-repo --replace-text <(echo 're_bAXo...CHEIA_COMPLETA...==>RESEND_KEY_REMOVED')
git push --force origin main
```

⚠️ `--force` rescrie istoricul — oricine are un clone trebuie să re-cloneze. Alternativ, pe GitHub poți cere scrub prin support dacă repo e public.

Verifică și dacă repo-ul e **public**: https://github.com/RobertRaulea/hawaii-woodworking → dacă scrie "Public", Pasul 7 devine prioritar (cheia a fost expusă public — rotirea din Pasul 1 e oricum fixul principal).

---

## Pasul 8 — Igienă continuă

1. **Dependabot**: pe GitHub → repo → **Settings → Code security** → activează *Dependabot alerts*, *Dependabot security updates* și *Dependabot version updates* (`.github/dependabot.yml` e deja commit-uit).
2. `npm audit` la fiecare update major; `min-release-age=7` din `.npmrc` poate întârzia fix-uri foarte proaspete — dacă `npm audit fix` se blochează pe un patch urgent, adaugă temporar pachetul în `min-release-age-exclude`.
3. Opțional, la moment potrivit: `vite` 5→8 (ultimele advisory-uri dev-only sunt fixate doar în 6.4.4+/7/8) și `convex` 1.31.6→1.48.

---

## Checklist final

- [x] Cheie Resend veche revocată, cheie nouă setată în Convex prod (+dev +.env local)
- [x] `npx convex deploy` rulat; `rateLimits` vizibil în prod
- [x] `git push` → Vercel deploy live, headere verificate (`/products`)
- [ ] Verifică și cheia **"Onboarding"** în Resend dashboard (full access, valoare necunoscută — șterge-o dacă nu o recunoști)
- [ ] Login admin + checkout + POS testate pe live
- [ ] CSP trecut în enforced după verificarea consolei (Pasul 6)
- [ ] Dependabot activat în repo settings (Settings → Code security)
- [ ] (opțional) istoric git curățat — repo-ul e **public**
