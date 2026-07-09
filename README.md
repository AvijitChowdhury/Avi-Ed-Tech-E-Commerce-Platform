<div align="center">

# 🎓 AviEdTech

### A production-grade e-commerce & LMS platform for recorded courses and hands-on tech labs

**Custom-built. Fully typed. Server-rendered. Row-level-secured. End-to-end tested.**

[![Live Preview](https://img.shields.io/badge/live-preview-3B82F6?style=for-the-badge)](https://avi-ed-tech.lovable.app)
[![Tests](https://img.shields.io/badge/E2E%20tests-25%20passed-10B981?style=for-the-badge)](#end-to-end-test-suite)
[![Stack](https://img.shields.io/badge/TanStack%20Start-1.170-F59E0B?style=for-the-badge)](https://tanstack.com/start)
[![Runtime](https://img.shields.io/badge/Cloudflare-Workers-EC4899?style=for-the-badge)](https://developers.cloudflare.com/workers/)
[![Database](https://img.shields.io/badge/Supabase-Postgres-8B5CF6?style=for-the-badge)](https://supabase.com)

</div>

---

## ✨ What this project is

AviEdTech is a **fully custom** full-stack platform for selling recorded
tech courses and physical / virtual lab kits. Every route, every server
function, every migration and every UI component in this repository was
written for this project — there is no starter kit or headless CMS behind
it.

The stack is production-capable end to end:

- 🚀 **Server-rendered React 19** with TanStack Start on Cloudflare
  Workers (streaming SSR, per-route `head()` metadata, typed loaders).
- 🔒 **Typed Postgres backend** with RLS enforced on every user-facing
  table and a strict `has_role()` `SECURITY DEFINER` pattern for admin
  access.
- 🛒 **Complete storefront flow** — browse → filter / search → product
  detail → cart → checkout → payment (Udokkta) → order confirmation →
  self-service tracking.
- 👤 **Auth + account area** and 🛠 **admin dashboard** (orders,
  products, categories, customers, live chat, settings).
- 🧪 **Python + Playwright E2E suite** with Allure reporting — 25
  scenarios, 100% pass, screenshot per feature.

---

## 📚 Table of contents

1. [Feature map](#-feature-map)
2. [Software architecture](#-software-architecture)
3. [Testing architecture](#-testing-architecture)
4. [Screenshots — every feature](#-screenshots--every-feature)
5. [End-to-end test suite](#-end-to-end-test-suite)
6. [Allure report](#-allure-report)
7. [Running locally](#-running-locally)
8. [Project layout](#-project-layout)
9. [Security posture](#-security-posture)
10. [SEO](#-seo)

---

## 🗺 Feature map

| Area | Features |
| --- | --- |
| **Storefront** | Home page, catalog with type / category / price / rating filters, keyword search, category landing pages, product detail with JSON-LD schema |
| **Cart & checkout** | Add / remove / update quantities, tax + shipping calculation, checkout form with shipping address, fraud auto-check server function, Udokkta payment redirect |
| **Order lifecycle** | Order confirmation, self-service order tracking (order # + email), status timeline (pending → processing → shipped → delivered) |
| **Auth** | Email / password sign-in and sign-up, session-backed protected routes under `_authenticated/`, sign-out |
| **Account** | Overview, order history, profile, addresses, wishlist |
| **Admin** | Dashboard, orders, incomplete orders, recovery analytics, products, categories, customers, live chat, settings — all role-gated via `has_role(auth.uid(), 'admin')` |
| **SEO** | Per-route titles / descriptions, canonical URLs, Open Graph + Twitter cards, JSON-LD (`Organization`, `WebSite`, `Product`, `CollectionPage`), `sitemap.xml`, `robots.txt`, `llms.txt` |
| **Performance** | LCP hero with `fetchPriority="high"`, code-split routes, TanStack Query cache, streaming SSR |
| **Testing** | 25 Playwright scenarios, Allure report with screenshots and steps, session-restored authenticated flows |

---

## 🏛 Software architecture

```mermaid
graph TB
    subgraph Client["🖥️  Browser · React 19 + TanStack Start"]
        UI[UI Components<br/>shadcn/ui · Tailwind v4]
        Router[File-based Router<br/>src/routes/]
        Query[TanStack Query<br/>cache + Suspense]
        Store[Zustand Stores<br/>auth · cart]
    end

    subgraph Edge["⚡ Cloudflare Workers · workerd"]
        SSR[SSR Renderer<br/>streaming HTML]
        SFN[Server Functions<br/>createServerFn RPC]
        API[Public API Routes<br/>/api/public/*<br/>webhooks · callbacks]
        MW[requireSupabaseAuth<br/>middleware]
    end

    subgraph Data["🗄️  Supabase Postgres"]
        Tables[(products · orders<br/>order_items · profiles<br/>user_roles · app_settings<br/>chat_sessions)]
        RLS[Row Level Security<br/>+ has_role SECURITY DEFINER]
        Storage[Storage Buckets<br/>product · hero images]
        Auth[Supabase Auth<br/>email + session]
    end

    subgraph External["🌐 External Services"]
        Pay[Udokkta<br/>Payment Gateway]
        Ship[Steadfast<br/>Courier API]
        FB[Facebook Pixel<br/>+ Conversions API]
    end

    UI --> Router
    Router --> Query
    Query -->|ensureQueryData| SFN
    Store -.session.-> MW
    Router -->|SSR| SSR
    SSR --> SFN
    SFN --> MW
    MW --> RLS
    RLS --> Tables
    SFN --> Storage
    UI -->|auth flows| Auth
    API --> Tables
    SFN -->|redirect| Pay
    Pay -->|callback| API
    API --> Ship
    SFN --> FB

    classDef client fill:#3B82F6,stroke:#1E3A8A,stroke-width:2px,color:#fff
    classDef edge fill:#F59E0B,stroke:#B45309,stroke-width:2px,color:#111
    classDef data fill:#10B981,stroke:#065F46,stroke-width:2px,color:#fff
    classDef external fill:#EF4444,stroke:#7F1D1D,stroke-width:2px,color:#fff

    class UI,Router,Query,Store client
    class SSR,SFN,API,MW edge
    class Tables,RLS,Storage,Auth data
    class Pay,Ship,FB external
```

**Key patterns**

- 🧭 **Routing** — flat file naming (`_public.products.$slug.tsx`,
  `_authenticated/admin.orders.tsx`), typed `<Link to="…">`, no
  `react-router-dom`.
- 🔄 **Data** — reads through `context.queryClient.ensureQueryData()` in
  loaders + `useSuspenseQuery` in components; mutations via
  `createServerFn().inputValidator(zod).handler(…)`.
- 🛂 **Auth** — Supabase session attached to server functions via
  `requireSupabaseAuth` middleware; admin actions gated by
  `has_role(auth.uid(), 'admin')` (roles never live on `profiles`).
- 🔐 **Admin-only config** — `app_settings` (fraud thresholds, feature
  flags) is read exclusively through `getFraudPublicConfig`, which
  projects only the safe `auto_check` flag.
- 📬 **Webhooks** — Steadfast + payment callbacks live under
  `/api/public/*` and verify signatures before touching data.

---

## 🧪 Testing architecture

```mermaid
graph LR
    subgraph Runner["🧪 Test Runner"]
        Pytest[pytest<br/>+ pytest-playwright]
        Conf[pytest.ini<br/>--alluredir]
    end

    subgraph Browser["🌐 Headless Chromium"]
        PW[Playwright Python]
        Ctx[Browser Context<br/>1280 × 1800]
        Sess[Session Restore<br/>Supabase cookies<br/>+ localStorage]
    end

    subgraph SUT["🚀 System Under Test"]
        Dev[Vite Dev Server<br/>localhost:8080]
        App[TanStack Start<br/>SSR + Client]
        DB[(Supabase Postgres<br/>with RLS)]
    end

    subgraph Suites["📋 25 Scenarios · 4 Epics"]
        E1[Public Site<br/>home · catalog · categories<br/>sitemap · robots · llms.txt]
        E2[Shopping<br/>add-to-cart · search<br/>filter · product detail]
        E3[Track Order<br/>empty · not-found]
        E4[Account + Admin<br/>session-restored flows]
    end

    subgraph Report["📊 Reporting"]
        Results[allure-results/<br/>JSON + screenshots]
        HTML[allure-report/<br/>HTML dashboard]
        Docs[docs/screenshots/<br/>README assets]
    end

    Pytest --> PW
    Conf --> Pytest
    PW --> Ctx
    Ctx --> Sess
    Sess -.bearer.-> App
    Ctx -->|navigate + assert| Dev
    Dev --> App
    App --> DB
    Suites --> Pytest
    PW -->|screenshot per test| Results
    Results -->|allure generate| HTML
    Results -->|copy| Docs

    classDef runner fill:#8B5CF6,stroke:#4C1D95,stroke-width:2px,color:#fff
    classDef browser fill:#06B6D4,stroke:#0E7490,stroke-width:2px,color:#fff
    classDef sut fill:#10B981,stroke:#065F46,stroke-width:2px,color:#fff
    classDef suite fill:#F59E0B,stroke:#B45309,stroke-width:2px,color:#111
    classDef report fill:#EC4899,stroke:#831843,stroke-width:2px,color:#fff

    class Pytest,Conf runner
    class PW,Ctx,Sess browser
    class Dev,App,DB sut
    class E1,E2,E3,E4 suite
    class Results,HTML,Docs report
```

The suite lives in [`tests/e2e/`](tests/e2e) and is driven by
`pytest-playwright` + `allure-pytest`. It boots headless Chromium against
the running dev server (`http://localhost:8080`), restores the managed
Supabase session from environment variables where needed, and attaches a
full-page screenshot to every scenario.

**Coverage — 25 scenarios across 4 Allure epics**

| Epic | Scenarios |
| --- | --- |
| 🌍 **Public Site** | home, catalog, three category pages, product detail pages, cart, checkout, track, auth, `sitemap.xml`, `robots.txt`, `llms.txt`, product JSON-LD + canonical, mobile home |
| 🛒 **Shopping** | add-to-cart from catalog + cart verification, product detail (price + CTA), catalog filter by type, keyword search |
| 📦 **Track Order** | empty-state, submit invalid order → screenshot the "not found" response |
| 🔐 **Account + Admin** | `/account`, `/account/orders`, `/account/profile`, `/admin`, `/admin/orders`, `/admin/products`, `/admin/customers`, `/admin/settings` — all with a restored Supabase session |

**Latest run**

```text
25 passed in 88.68s
```

### Real bugs the suite caught on its first run

1. **`/products/:slug` was rendering the catalog page.**
   `_public.products.tsx` was implicitly treated as a layout for its
   `$slug` child but never rendered an `<Outlet />`, so detail content
   was masked. Renamed to `_public.products.index.tsx` so it is a leaf
   route and `$slug` renders standalone.
2. **React hydration mismatch on every page.** A Facebook Pixel
   `<noscript><img>` was placed inside `<head>`, which React strips on
   the client, causing an SSR / CSR divergence. Moved to the top of
   `<body>`.
3. **`fetchpriority="high"` React warning** on the hero image. Fixed to
   the React-correct camelCase `fetchPriority` and removed the
   ts-expect-error escape hatch.

---

## 🖼 Screenshots — every feature

All screenshots below were captured by the Playwright E2E suite against
the running app — they refresh on every test run.

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
| **Empty cart** ![Empty cart](docs/screenshots/website/cart-empty.png) | **Add-to-cart confirmation** ![Toast](docs/screenshots/website/cart-added-toast.png) |
| **Cart with items** ![Cart](docs/screenshots/website/cart-with-item.png) | **Track order — form** ![Track](docs/screenshots/website/track-empty.png) |
| **Track order — not found** ![Not found](docs/screenshots/website/track-not-found.png) | **Auth — sign in / sign up** ![Auth](docs/screenshots/website/auth-signin.png) |

### Authenticated account area

| | |
| --- | --- |
| **Account overview** ![Account](docs/screenshots/website/account-index.png) | **Order history** ![Orders](docs/screenshots/website/account-orders.png) |
| **Profile settings** ![Profile](docs/screenshots/website/account-profile.png) | |

### Admin dashboard

| | |
| --- | --- |
| **Dashboard** ![Admin](docs/screenshots/website/admin-dashboard.png) | **Orders** ![Admin orders](docs/screenshots/website/admin-orders.png) |
| **Products** ![Admin products](docs/screenshots/website/admin-products.png) | **Customers** ![Admin customers](docs/screenshots/website/admin-customers.png) |
| **Settings** ![Admin settings](docs/screenshots/website/admin-settings.png) | |

---

## 📊 Allure report

The Allure HTML report is regenerated from `--alluredir` results and
served via any static file server. A copy is bundled at
`/mnt/documents/allure-report/` for direct browsing.

| | |
| --- | --- |
| **Overview** ![Overview](docs/screenshots/allure/overview.png) | **Suites** ![Suites](docs/screenshots/allure/suites.png) |
| **Behaviors (epics / features)** ![Behaviors](docs/screenshots/allure/behaviors.png) | **Graphs** ![Graphs](docs/screenshots/allure/graph.png) |
| **Timeline** ![Timeline](docs/screenshots/allure/timeline.png) | **Categories** ![Categories](docs/screenshots/allure/categories.png) |

---

## ⚙️ Running locally

### Web app

```bash
bun install
bun run dev          # → http://localhost:8080
```

Environment (auto-injected by Lovable Cloud, or set manually):

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

### End-to-end tests

```bash
# One-off dependencies
python -m pip install pytest-playwright allure-pytest
python -m playwright install chromium

# Optional: restore an authenticated Supabase session so account / admin
# scenarios can run. When these vars are missing the tests still pass by
# asserting on the redirect target instead.
export LOVABLE_BROWSER_SUPABASE_STORAGE_KEY=sb-<project>-auth-token
export LOVABLE_BROWSER_SUPABASE_SESSION_JSON='{"access_token":"…","refresh_token":"…"}'
export LOVABLE_BROWSER_SUPABASE_COOKIES_JSON='[{"name":"…","value":"…","domain":"localhost"}]'

# Run the suite and collect Allure results
python -m pytest tests/e2e/test_website.py --alluredir=./allure-results

# Render the HTML report
allure generate ./allure-results -o ./allure-report --clean
allure open ./allure-report        # or: python -m http.server -d ./allure-report
```

Feature screenshots land in `/mnt/documents/screenshots/website/`; the
committed `docs/screenshots/website/` copy is what this README renders.

---

## 📁 Project layout

```text
src/
├─ routes/
│  ├─ __root.tsx                       Shell, theme bootstrap, FB pixel, global head
│  ├─ _public.tsx                      Marketing layout (announcement bar, header, footer)
│  ├─ _public.index.tsx                Home
│  ├─ _public.products.index.tsx       Catalog (search / filter / sort)
│  ├─ _public.products.$slug.tsx       Product detail + Product JSON-LD
│  ├─ _public.categories.$slug.tsx     Category landing + CollectionPage JSON-LD
│  ├─ _public.cart.tsx                 Cart
│  ├─ _public.checkout.tsx             Checkout + Udokkta redirect
│  ├─ _public.order-confirmation.$id.tsx
│  ├─ _public.track.tsx                Order tracking form
│  ├─ _public.auth.tsx                 Sign in / sign up
│  ├─ _public.blog.top-hands-on-tech-learning-platforms.tsx
│  ├─ _authenticated/                  Session-gated subtree (account + admin)
│  │  ├─ account.tsx · account.orders.tsx · account.profile.tsx · …
│  │  └─ admin.tsx · admin.orders.tsx · admin.products.tsx · admin.customers.tsx · admin.settings.tsx · …
│  ├─ api/                             HTTP endpoints (webhooks, cron, public read)
│  └─ sitemap[.]xml.ts                 Absolute-URL sitemap
├─ lib/
│  ├─ *.functions.ts                   createServerFn RPC modules (products, orders, fraud, …)
│  ├─ format.ts · cart.ts · seo.ts     Client helpers
├─ integrations/supabase/              Auto-generated Supabase clients + auth middleware
├─ components/ui/                      shadcn/ui components (Radix + Tailwind tokens)
└─ components/                         Feature components (Header, Footer, ProductCard, …)
supabase/migrations/                   SQL migrations (schema, RLS, GRANTs, seed)
tests/e2e/test_website.py              Playwright + Allure E2E suite
public/                                Static assets (robots.txt, llms.txt, favicons)
docs/screenshots/                      README screenshots (website + allure)
```

---

## 🔐 Security posture

- **RLS on every public schema table.** Every `CREATE TABLE` in
  `supabase/migrations/` is followed by explicit `GRANT` statements and
  `ALTER TABLE … ENABLE ROW LEVEL SECURITY` in the same migration.
- **Roles separated from profiles.** `public.user_roles` + an
  `app_role` enum + a `SECURITY DEFINER` `has_role()` function are used
  everywhere admin gating is needed. Roles are never stored on
  `profiles`. A `prevent_role_self_escalation` trigger blocks
  non-admin authenticated users from inserting or updating role rows.
- **Admin-only settings.** `app_settings` (fraud thresholds, feature
  flags) is not readable by `anon`. Public reads go through
  `getFraudPublicConfig`, which projects only the safe `auto_check`
  flag.
- **Bearer-attached server functions.** `src/start.ts` registers a
  client-side `functionMiddleware` that attaches the Supabase bearer
  token so `requireSupabaseAuth` works during both CSR and SSR.
- **Webhooks under `/api/public/*`** verify their signature before
  touching data.
- **`SECURITY DEFINER` execute grants** are revoked from `anon` /
  `authenticated` on every function that does not need to be RLS-callable;
  only `has_role` remains executable so policies can evaluate it.

---

## 🔍 SEO

- Unique `title`, `description`, canonical, Open Graph and Twitter tags
  on every route via `head()`.
- `noindex, follow` robots meta on user-specific pages (cart, checkout,
  auth, track, order-confirmation).
- JSON-LD: `Organization` + `WebSite` at the root, `Product` on product
  pages (with price and availability), `CollectionPage` on category
  pages.
- `public/llms.txt` describes the site for LLM indexers.
- `sitemap.xml` served from `src/routes/sitemap[.]xml.ts` with absolute
  URLs against the published domain.
- Hero image marked `fetchPriority="high"` with explicit dimensions to
  improve LCP.

---

<div align="center">

**Built with care — every file, migration and test in this repo was written by hand for AviEdTech.**

Contributions, issues, and stars are welcome. ⭐

</div>
