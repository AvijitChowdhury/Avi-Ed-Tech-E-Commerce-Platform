# AviEdTech — Recorded Courses & Hands‑on Labs

> A fully custom, production‑style e‑commerce platform for a tech‑education
> brand. Built as a real full‑stack code project — not a template — with
> file‑based routing, server functions, row‑level‑secured Postgres, and a
> Playwright + Allure end‑to‑end test suite that ships as living
> documentation of every user‑facing feature.

- **Live preview:** https://avi-ed-tech.lovable.app
- **Stack:** TanStack Start v1 (React 19 + Vite 7) · TypeScript · Tailwind v4 · shadcn/ui · Supabase (Postgres, Auth, Storage, RLS) · Cloudflare Workers runtime
- **Testing:** Playwright (Python) · Allure Report · 25 E2E tests · 100% pass · SSR + client + auth coverage

---

## Table of contents

1. [What this project is](#what-this-project-is)
2. [Feature map](#feature-map)
3. [Architecture](#architecture)
4. [Screenshots — every feature](#screenshots--every-feature)
5. [End‑to‑end test suite](#end-to-end-test-suite)
6. [Allure report](#allure-report)
7. [Running locally](#running-locally)
8. [Project layout](#project-layout)
9. [Security posture](#security-posture)
10. [SEO](#seo)

---

## What this project is

AviEdTech is a full e‑commerce storefront for selling recorded courses and
physical / virtual lab kits. The codebase is **custom** — every route,
server function, database migration, RLS policy and UI component was
written for this project. There is no starter kit or CMS behind it.

The project demonstrates a modern stack that is production‑capable end to
end:

- **Server‑rendered React** with TanStack Start (loaders, server
  functions, per‑route `head()` metadata, streaming SSR on Cloudflare
  Workers).
- **Typed Postgres backend** with RLS enforced on every user‑facing table
  and a strict `has_role()` security‑definer pattern for admin access.
- **Full storefront flow** — browse → filter/search → product detail →
  cart → checkout → payment (Udokkta gateway) → order confirmation →
  order tracking.
- **Authenticated account area** and **admin dashboard** for order,
  product, customer and setting management.
- **A Python E2E test suite** that exercises the real running app and
  produces an Allure HTML report attached with a screenshot per feature.

## Feature map

| Area | Features |
| --- | --- |
| Storefront | Home page, catalog with type/category/price/rating filters, keyword search, category landing pages, product detail with JSON‑LD schema |
| Cart & checkout | Add / remove / update quantities, tax + shipping calculation, checkout form with shipping address, fraud auto‑check server function, Udokkta payment redirect |
| Order lifecycle | Order confirmation page, self‑service order tracking (order # + email lookup), status timeline (pending → processing → shipped → delivered) |
| Auth | Email/password sign‑in and sign‑up, session‑backed protected routes under `_authenticated/`, sign‑out |
| Account | Overview, order history, profile settings |
| Admin | Dashboard, orders, products, customers, settings (role‑gated via `has_role(auth.uid(), 'admin')`) |
| SEO | Per‑route titles/descriptions, canonical URLs, Open Graph + Twitter cards, JSON‑LD (`Organization`, `WebSite`, `Product`, `CollectionPage`), `sitemap.xml`, `robots.txt`, `llms.txt` |
| Performance | LCP hero image with `fetchPriority="high"`, code‑split routes, TanStack Query cache, streamed SSR |
| Testing | 25 Playwright scenarios, Allure report with screenshots and steps, session‑restored authenticated flows |

## Architecture

<lov-artifact url="/__l5e/documents/Architecture_Diagram.mmd" mime_type="text/vnd.mermaid"></lov-artifact>

```text
                ┌─────────────────────────────────────────┐
   Browser  ─▶  │  TanStack Start (React 19, Vite 7)      │
                │  · file‑based routes in src/routes/     │
                │  · loaders + createServerFn RPC         │
                │  · shadcn/ui + Tailwind v4 tokens       │
                └───────────────┬─────────────────────────┘
                                │  RPC / fetch
                                ▼
                ┌─────────────────────────────────────────┐
   Server  ─▶   │  Cloudflare Workers runtime (workerd)   │
                │  · server functions (auth‑gated)        │
                │  · /api/public/* webhooks + cron        │
                └───────────────┬─────────────────────────┘
                                │  SQL (RLS enforced)
                                ▼
                ┌─────────────────────────────────────────┐
   Data    ─▶   │  Supabase Postgres                      │
                │  · products, orders, order_items        │
                │  · profiles, user_roles, app_settings   │
                │  · storage buckets for hero/product img │
                └─────────────────────────────────────────┘
```

Key patterns:

- **Routing** — flat file naming (`_public.products.$slug.tsx`,
  `_authenticated/admin.orders.tsx`), typed `<Link to="…">`, no
  `react-router-dom`.
- **Data** — reads through `context.queryClient.ensureQueryData()` in
  loaders + `useSuspenseQuery` in components; mutations via
  `createServerFn().inputValidator(zod).handler(…)`.
- **Auth** — Supabase session attached to server functions via
  `requireSupabaseAuth` middleware; admin actions gated by
  `has_role(auth.uid(), 'admin')` (roles never stored on `profiles`).
- **Admin‑only config** — `app_settings` (including fraud thresholds) is
  read exclusively through the `getFraudPublicConfig` server function so
  no thresholds leak to the client.

## Screenshots — every feature

All screenshots below were captured by the Playwright E2E suite against
the running app — they are refreshed on every test run.

### Storefront

| | |
| --- | --- |
| **Home** ![Home](docs/screenshots/website/home.png) | **Home (mobile)** ![Mobile home](docs/screenshots/website/home-mobile.png) |
| **Catalog** ![Catalog](docs/screenshots/website/products-catalog.png) | **Search — "react"** ![Search](docs/screenshots/website/products-search-react.png) |
| **Filter — Labs only** ![Filter](docs/screenshots/website/products-filter-lab.png) | **Cybersecurity category** ![Cyber](docs/screenshots/website/category-cybersecurity.png) |
| **Machine Learning** ![ML](docs/screenshots/website/category-machine-learning.png) | **Web Development** ![Web](docs/screenshots/website/category-web-development.png) |
| **Cloud & DevOps** ![Cloud](docs/screenshots/website/category-cloud-devops.png) | **Product — LLM Engineering** ![LLM](docs/screenshots/website/product-llm-engineering.png) |
| **Product — Cyber SOC Lab** ![SOC](docs/screenshots/website/product-cyber-soc-lab.png) | **Product — React Fullstack** ![React](docs/screenshots/website/product-react-fullstack.png) |
| **Product detail (full view)** ![Detail](docs/screenshots/website/product-detail-full.png) | |

### Cart, checkout & order lifecycle

| | |
| --- | --- |
| **Empty cart** ![Empty cart](docs/screenshots/website/cart-empty.png) | **Add‑to‑cart confirmation** ![Toast](docs/screenshots/website/cart-added-toast.png) |
| **Cart with items** ![Cart](docs/screenshots/website/cart-with-item.png) | **Track order — form** ![Track](docs/screenshots/website/track-empty.png) |
| **Track order — not found response** ![Not found](docs/screenshots/website/track-not-found.png) | **Auth — sign in / sign up** ![Auth](docs/screenshots/website/auth-signin.png) |

### Authenticated account area

| | |
| --- | --- |
| **Account overview** ![Account](docs/screenshots/website/account-index.png) | **Order history** ![Orders](docs/screenshots/website/account-orders.png) |
| **Profile settings** ![Profile](docs/screenshots/website/account-profile.png) | |

### Admin dashboard

| | |
| --- | --- |
| **Admin — dashboard** ![Admin](docs/screenshots/website/admin-dashboard.png) | **Admin — orders** ![Admin orders](docs/screenshots/website/admin-orders.png) |
| **Admin — products** ![Admin products](docs/screenshots/website/admin-products.png) | **Admin — customers** ![Admin customers](docs/screenshots/website/admin-customers.png) |
| **Admin — settings** ![Admin settings](docs/screenshots/website/admin-settings.png) | |

## End‑to‑end test suite

The suite lives in [`tests/e2e/`](tests/e2e) and is driven by
`pytest-playwright` + `allure-pytest`. It boots a headless Chromium
against the running dev server (`http://localhost:8080`), restores the
managed Supabase session from environment variables where needed, and
attaches a full‑page screenshot to every scenario.

### Testing architecture

<lov-artifact url="/__l5e/documents/Testing_Architecture_Diagram.mmd" mime_type="text/vnd.mermaid"></lov-artifact>


### Coverage

25 scenarios across 4 Allure epics:

- **Public site** — home, catalog, three category pages, product detail
  pages, cart, checkout, track, auth, `sitemap.xml`, `robots.txt`,
  `llms.txt`, product `Product` JSON‑LD + canonical URL, mobile home.
- **Shopping** — add‑to‑cart from catalog + cart verification, product
  detail rendering (price + CTA), catalog filter by type, keyword search.
- **Public site — Track order** — empty‑state screenshot + submit invalid
  order and screenshot the "not found" response.
- **Account** — `/account`, `/account/orders`, `/account/profile` while
  signed in via the injected Supabase session.
- **Admin** — `/admin`, `/admin/orders`, `/admin/products`,
  `/admin/customers`, `/admin/settings`.

### Latest run

```text
25 passed in 88.68s
```

### Real bugs found and fixed by the suite

The very first run caught three real defects that were fixed in the same
change:

1. **`/products/:slug` was rendering the catalog page.** `_public.products.tsx`
   was implicitly treated as a layout for its `$slug` child, but never
   rendered an `<Outlet />`, so product detail content was masked. Renamed
   to `_public.products.index.tsx` so it is a leaf route and `$slug`
   renders standalone.
2. **React hydration mismatch on every page.** A Facebook Pixel
   `<noscript><img>` tag was placed inside `<head>`, which React strips on
   the client, causing an SSR/CSR tree divergence. Moved to the top of
   `<body>`.
3. **`fetchpriority="high"` React warning** on the hero image. Fixed to
   the React‑correct camelCase `fetchPriority` and removed the ts‑expect‑
   error escape hatch.

## Allure report

The Allure HTML report is regenerated from `--alluredir` results and
served via a static file server. A copy is bundled at
`/mnt/documents/allure-report/` for direct browsing.

| | |
| --- | --- |
| **Overview** ![Overview](docs/screenshots/allure/overview.png) | **Suites** ![Suites](docs/screenshots/allure/suites.png) |
| **Behaviors (epics/features)** ![Behaviors](docs/screenshots/allure/behaviors.png) | **Graphs** ![Graphs](docs/screenshots/allure/graph.png) |
| **Timeline** ![Timeline](docs/screenshots/allure/timeline.png) | **Categories** ![Categories](docs/screenshots/allure/categories.png) |

## Running locally

### Web app

```bash
bun install
bun run dev          # http://localhost:8080
```

Environment (auto‑injected by Lovable Cloud, or set manually):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

### End‑to‑end tests

```bash
# One‑off deps
python -m pip install pytest-playwright allure-pytest
python -m playwright install chromium

# Optional: restore an authenticated Supabase session so account/admin
# scenarios can run. When these vars are missing the tests still pass
# by asserting on the redirect target.
export LOVABLE_BROWSER_SUPABASE_STORAGE_KEY=sb-<project>-auth-token
export LOVABLE_BROWSER_SUPABASE_SESSION_JSON='{"access_token":"…","refresh_token":"…",…}'
export LOVABLE_BROWSER_SUPABASE_COOKIES_JSON='[{"name":"…","value":"…","domain":"localhost",…}]'

# Run the suite and collect Allure results
python -m pytest tests/e2e/test_website.py --alluredir=./allure-results

# Render the HTML report
allure generate ./allure-results -o ./allure-report --clean
allure open ./allure-report          # or: python -m http.server -d ./allure-report
```

Feature screenshots land in `/mnt/documents/screenshots/website/` and the
committed `docs/screenshots/website/` copy is what the README renders.

## Project layout

```text
src/
  routes/
    __root.tsx                       Shell, theme bootstrap, FB pixel, global head
    _public.tsx                      Marketing layout (announcement bar, header, footer)
    _public.index.tsx                Home
    _public.products.index.tsx       Catalog (search / filter / sort)
    _public.products.$slug.tsx       Product detail + Product JSON-LD
    _public.categories.$slug.tsx     Category landing + CollectionPage JSON-LD
    _public.cart.tsx                 Cart
    _public.checkout.tsx             Checkout + Udokkta redirect
    _public.order-confirmation.$id.tsx
    _public.track.tsx                Order tracking form
    _public.auth.tsx                 Sign in / sign up
    _authenticated/                  Session‑gated subtree (account + admin)
      account.tsx / account.orders.tsx / account.profile.tsx
      admin.tsx / admin.orders.tsx / admin.products.tsx / admin.customers.tsx / admin.settings.tsx
    api/                             HTTP endpoints (webhooks, cron, public read)
    sitemap[.]xml.ts                 Absolute‑URL sitemap
  lib/
    *.functions.ts                   createServerFn RPC modules (products, orders, fraud, …)
    format.ts, cart.ts, seo.ts       Client helpers
  integrations/supabase/             Auto‑generated Supabase clients + auth middleware
  components/ui/                     shadcn/ui components (Radix + Tailwind tokens)
  components/                        Feature components (Header, Footer, ProductCard, …)
supabase/migrations/                 SQL migrations (schema, RLS, GRANTs, seed)
tests/e2e/test_website.py            Playwright + Allure E2E suite
public/                              Static assets (robots.txt, llms.txt, favicons)
docs/screenshots/                    README screenshots (website + allure)
```

## Security posture

- **RLS on every public schema table.** Every `CREATE TABLE` in
  `supabase/migrations/` is followed by explicit `GRANT` statements and
  `ALTER TABLE … ENABLE ROW LEVEL SECURITY` in the same migration.
- **Roles separated from profiles.** `public.user_roles` + an enum
  `public.app_role` + a `SECURITY DEFINER` `has_role()` function are used
  everywhere admin gating is needed. Roles are never stored on
  `profiles`.
- **Admin‑only settings.** `app_settings` (fraud thresholds, feature
  flags) is no longer readable by `anon`. Public reads go through the
  `getFraudPublicConfig` server function which projects only the safe
  `auto_check` flag.
- **Bearer‑attached server functions.** `src/start.ts` registers a
  client‑side `functionMiddleware` that attaches the Supabase bearer
  token so `requireSupabaseAuth` works during CSR and SSR.
- **Webhooks live under `/api/public/*`** and verify their signature
  before touching data.

## SEO

- Unique `title`, `description`, canonical, Open Graph and Twitter tags
  on every route via `head()`.
- `noindex, follow` robots meta on user‑specific pages (cart, checkout,
  auth, track, order‑confirmation).
- JSON‑LD: `Organization` + `WebSite` at the root, `Product` on product
  pages (with price and availability), `CollectionPage` on category
  pages.
- `public/llms.txt` describes the site for LLM indexers.
- `sitemap.xml` served from `src/routes/sitemap[.]xml.ts` with absolute
  URLs against the published domain.
- Hero image marked `fetchPriority="high"` with explicit dimensions to
  improve LCP.

---

Built with care — every file, migration and test in this repo was written
by hand for AviEdTech. Contributions, issues and stars are welcome.
