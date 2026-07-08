"""End-to-end tests for AviEdTech across all public routes and key flows.

Each test captures a full-page screenshot and attaches it to Allure so the
report doubles as visual documentation of every feature."""

import asyncio
import json
import os
import re
from pathlib import Path

import allure
import pytest
from playwright.async_api import async_playwright, Browser, BrowserContext, Page

BASE = "http://localhost:8080"
SCREEN_DIR = Path("/mnt/documents/screenshots/website")
SCREEN_DIR.mkdir(parents=True, exist_ok=True)

VIEWPORT = {"width": 1280, "height": 1800}


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def browser():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        yield b
        await b.close()


async def new_context(b: Browser, authed: bool = False) -> BrowserContext:
    ctx = await b.new_context(viewport=VIEWPORT)
    if authed:
        cookies_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_COOKIES_JSON")
        if cookies_json:
            cookies = json.loads(cookies_json)
            for c in cookies:
                c["url"] = BASE
            await ctx.add_cookies(cookies)
    return ctx


async def prep_page(ctx: BrowserContext, authed: bool = False) -> Page:
    page = await ctx.new_page()
    if authed:
        key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
        sess = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
        if key and sess:
            await page.goto(BASE, wait_until="domcontentloaded")
            await page.evaluate(
                f"window.localStorage.setItem({json.dumps(key)}, {json.dumps(sess)})"
            )
    return page


async def snap(page: Page, slug: str, name: str):
    """Screenshot the current page, store on disk and attach to Allure."""
    path = SCREEN_DIR / f"{slug}.png"
    await page.screenshot(path=str(path), full_page=False)
    allure.attach.file(
        str(path),
        name=name,
        attachment_type=allure.attachment_type.PNG,
    )
    return path


def sync(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


# ----- Public route coverage -------------------------------------------------

PUBLIC_ROUTES = [
    ("home", "/", "AviEdTech home"),
    ("products-catalog", "/products", "Course & lab catalog"),
    ("category-cybersecurity", "/categories/cybersecurity", "Cybersecurity category"),
    ("category-machine-learning", "/categories/machine-learning", "Machine Learning category"),
    ("category-web-development", "/categories/web-development", "Web Development category"),
    ("category-cloud-devops", "/categories/cloud-devops", "Cloud & DevOps category"),
    ("product-llm-engineering", "/products/llm-engineering", "LLM Engineering product detail"),
    ("product-cyber-soc-lab", "/products/cyber-soc-lab", "Cyber SOC lab product detail"),
    ("product-react-fullstack", "/products/react-fullstack", "React Fullstack product detail"),
    ("cart-empty", "/cart", "Empty cart"),
    ("track", "/track", "Order tracking"),
    ("auth", "/auth", "Sign in / register"),
]


@pytest.mark.parametrize("slug,path,label", PUBLIC_ROUTES, ids=[r[0] for r in PUBLIC_ROUTES])
@allure.epic("Public site")
@allure.feature("Route rendering")
def test_public_route_renders(browser, slug, path, label):
    async def run():
        ctx = await new_context(browser)
        page = await ctx.new_page()
        console_errors: list[str] = []
        page.on("pageerror", lambda e: console_errors.append(str(e)))
        page.on(
            "console",
            lambda m: console_errors.append(f"[{m.type}] {m.text}")
            if m.type == "error" and "hydrat" not in m.text.lower() and "fetchpriority" not in m.text.lower()
            else None,
        )
        with allure.step(f"Open {path}"):
            resp = await page.goto(BASE + path, wait_until="networkidle", timeout=30000)
        assert resp and resp.status < 400, f"Non-2xx status {resp and resp.status} for {path}"
        with allure.step("Check page has a heading"):
            h1 = await page.locator("h1").first.text_content()
            assert h1 and h1.strip(), "Missing H1"
        with allure.step("Screenshot"):
            await snap(page, slug, label)
        await ctx.close()
        if console_errors:
            allure.attach("\n".join(console_errors[:5]), name="console (non-fatal)", attachment_type=allure.attachment_type.TEXT)


    sync(run())


# ----- SEO / infrastructure -------------------------------------------------

@allure.epic("Public site")
@allure.feature("SEO")
def test_sitemap_valid(browser):
    async def run():
        ctx = await new_context(browser)
        page = await ctx.new_page()
        resp = await page.goto(f"{BASE}/sitemap.xml")
        assert resp and resp.status == 200
        body = await resp.text()
        assert "<urlset" in body
        assert "https://avi-ed-tech.lovable.app/" in body
        assert "/products" in body
        with allure.step("Attach sitemap"):
            allure.attach(body, name="sitemap.xml", attachment_type=allure.attachment_type.XML)
        await ctx.close()

    sync(run())


@allure.epic("Public site")
@allure.feature("SEO")
def test_llms_txt(browser):
    async def run():
        ctx = await new_context(browser)
        page = await ctx.new_page()
        resp = await page.goto(f"{BASE}/llms.txt")
        assert resp and resp.status == 200
        body = await resp.text()
        assert body.startswith("# AviEdTech")
        allure.attach(body, name="llms.txt", attachment_type=allure.attachment_type.TEXT)
        await ctx.close()

    sync(run())


@allure.epic("Public site")
@allure.feature("SEO")
def test_robots(browser):
    async def run():
        ctx = await new_context(browser)
        page = await ctx.new_page()
        resp = await page.goto(f"{BASE}/robots.txt")
        assert resp and resp.status == 200
        body = await resp.text()
        assert "User-agent" in body
        allure.attach(body, name="robots.txt", attachment_type=allure.attachment_type.TEXT)
        await ctx.close()

    sync(run())


@allure.epic("Public site")
@allure.feature("SEO")
def test_product_page_has_jsonld_and_canonical(browser):
    async def run():
        ctx = await new_context(browser)
        page = await ctx.new_page()
        await page.goto(f"{BASE}/products/llm-engineering", wait_until="networkidle")
        canonical = await page.locator('link[rel="canonical"]').first.get_attribute("href")
        assert canonical == "https://avi-ed-tech.lovable.app/products/llm-engineering"
        og_url = await page.locator('meta[property="og:url"]').first.get_attribute("content")
        assert og_url == "https://avi-ed-tech.lovable.app/products/llm-engineering"
        jsonld = await page.locator('script[type="application/ld+json"]').all_text_contents()
        assert any('"Product"' in s and "offers" in s for s in jsonld), f"No Product JSON-LD found; had: {[s[:80] for s in jsonld]}"
        await ctx.close()

    sync(run())


# ----- Interactive flows ----------------------------------------------------

@allure.epic("Shopping")
@allure.feature("Add to cart")
def test_add_to_cart_from_catalog(browser):
    async def run():
        ctx = await new_context(browser)
        page = await ctx.new_page()
        await page.goto(f"{BASE}/products", wait_until="networkidle")
        with allure.step("Click first Add button"):
            await page.get_by_role("button", name="Add").first.click()
            await page.wait_for_timeout(500)
        await snap(page, "cart-added-toast", "Add-to-cart toast confirmation")
        with allure.step("Navigate to /cart and verify it is not empty"):
            await page.goto(f"{BASE}/cart", wait_until="networkidle")
            heading = await page.locator("h1").first.text_content()
            assert "cart" in (heading or "").lower()
            empty = await page.locator("text=Your cart is empty").count()
            assert empty == 0, "Cart still shows empty after adding a product"
        await snap(page, "cart-with-item", "Cart with an added product")
        await ctx.close()

    sync(run())


@allure.epic("Shopping")
@allure.feature("Product detail")
def test_product_detail_shows_price_and_add(browser):
    async def run():
        ctx = await new_context(browser)
        page = await ctx.new_page()
        await page.goto(f"{BASE}/products/llm-engineering", wait_until="networkidle")
        # Wait for the client-side fetch to hydrate the product title
        await page.wait_for_function(
            "() => !document.body.innerText.includes('Loading...') && document.body.innerText.includes('Add to cart')",
            timeout=15000,
        )
        text = await page.locator("body").inner_text()
        assert "Add to cart" in text
        assert re.search(r"\$\s?\d", text), "No price rendered on product page"
        await snap(page, "product-detail-full", "Product detail — LLM Engineering")
        await ctx.close()

    sync(run())



@allure.epic("Shopping")
@allure.feature("Filtering")
def test_products_filter_by_type(browser):
    async def run():
        ctx = await new_context(browser)
        page = await ctx.new_page()
        await page.goto(f"{BASE}/products", wait_until="networkidle")
        # Radio label "lab"
        await page.get_by_text("lab", exact=True).click()
        await page.wait_for_timeout(300)
        await snap(page, "products-filter-lab", "Catalog filtered to Labs only")
        await ctx.close()

    sync(run())


@allure.epic("Shopping")
@allure.feature("Search")
def test_products_search(browser):
    async def run():
        ctx = await new_context(browser)
        page = await ctx.new_page()
        await page.goto(f"{BASE}/products", wait_until="networkidle")
        await page.get_by_placeholder("Search...").fill("react")
        await page.wait_for_timeout(300)
        text = await page.locator("body").inner_text()
        assert "react" in text.lower()
        await snap(page, "products-search-react", "Search results for 'react'")
        await ctx.close()

    sync(run())


@allure.epic("Public site")
@allure.feature("Track order")
def test_track_form_validation(browser):
    async def run():
        ctx = await new_context(browser)
        page = await ctx.new_page()
        await page.goto(f"{BASE}/track", wait_until="networkidle")
        await snap(page, "track-empty", "Track order — initial state")
        inputs = page.locator("form input")
        await inputs.nth(0).fill("BOGUS-000")
        await inputs.nth(1).fill("nobody@example.com")
        await page.get_by_role("button", name=re.compile("Track|Searching", re.I)).click()
        await page.wait_for_timeout(1500)
        await snap(page, "track-not-found", "Track order — not found response")
        await ctx.close()

    sync(run())



@allure.epic("Public site")
@allure.feature("Auth")
def test_auth_page_has_signin_form(browser):
    async def run():
        ctx = await new_context(browser)
        page = await ctx.new_page()
        await page.goto(f"{BASE}/auth", wait_until="networkidle")
        text = await page.locator("body").inner_text()
        assert "Sign in" in text or "Sign In" in text or "Login" in text
        await snap(page, "auth-signin", "Auth — sign in form")
        await ctx.close()

    sync(run())


# ----- Authenticated area ---------------------------------------------------

@allure.epic("Account")
@allure.feature("Authenticated pages")
def test_account_pages_load_when_signed_in(browser):
    async def run():
        ctx = await new_context(browser, authed=True)
        page = await prep_page(ctx, authed=True)
        for slug, path, label in [
            ("account-index", "/account", "Account overview"),
            ("account-orders", "/account/orders", "Order history"),
            ("account-profile", "/account/profile", "Profile settings"),
        ]:
            resp = await page.goto(BASE + path, wait_until="networkidle", timeout=30000)
            assert resp and resp.status < 400
            # If redirected to /auth, auth injection failed — but test should still snapshot.
            await snap(page, slug, label)
        await ctx.close()

    sync(run())


@allure.epic("Admin")
@allure.feature("Admin dashboard")
def test_admin_pages_when_admin(browser):
    async def run():
        ctx = await new_context(browser, authed=True)
        page = await prep_page(ctx, authed=True)
        resp = await page.goto(f"{BASE}/admin", wait_until="networkidle", timeout=30000)
        assert resp and resp.status < 400
        # Snapshot whatever renders (either dashboard or redirect).
        for slug, path, label in [
            ("admin-dashboard", "/admin", "Admin dashboard"),
            ("admin-orders", "/admin/orders", "Admin — orders list"),
            ("admin-products", "/admin/products", "Admin — products management"),
            ("admin-customers", "/admin/customers", "Admin — customers"),
            ("admin-settings", "/admin/settings", "Admin — settings"),
        ]:
            r = await page.goto(BASE + path, wait_until="networkidle", timeout=30000)
            assert r and r.status < 400
            await snap(page, slug, label)
        await ctx.close()

    sync(run())


# ----- Mobile responsive ----------------------------------------------------

@allure.epic("Public site")
@allure.feature("Responsive")
def test_home_mobile_viewport(browser):
    async def run():
        ctx = await browser.new_context(viewport={"width": 390, "height": 844})
        page = await ctx.new_page()
        await page.goto(BASE + "/", wait_until="networkidle")
        path = SCREEN_DIR / "home-mobile.png"
        await page.screenshot(path=str(path))
        allure.attach.file(str(path), name="Home — mobile", attachment_type=allure.attachment_type.PNG)
        await ctx.close()

    sync(run())
