import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";

/**
 * The theme is three things a unit test cannot reach: an attribute written
 * before any module runs, a stylesheet that resolves its tokens against that
 * attribute, and a choice that has to survive a reload. jsdom has no cascade,
 * so it can only prove the attribute was written — never that it changed a
 * single pixel.
 */

const accountInfo = {
    id: "user-1",
    username: "alice",
    email: "alice@example.com",
    isEmailVerified: true,
    providers: ["local"],
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
};

async function stubApi(page: Page) {
    await page.route("**/api/v1/**", async (route, request) => {
        const url = request.url();
        if (request.method() !== "GET") {
            await route.fulfill({ json: { meta: {} } });
            return;
        }
        if (url.includes("/users/me")) {
            await route.fulfill({ json: { data: accountInfo } });
            return;
        }
        if (url.includes("/tags/trends")) {
            await route.fulfill({ json: { data: { trends: [] } } });
            return;
        }
        await route.fulfill({ json: { data: [] } });
    });
}

/**
 * Seeds the two stores this file reads.
 *
 * The locale is pinned because `useI18n` sniffs `navigator.language`, and a
 * spec that clicks a pill labelled "Light" should say which language it means
 * rather than inherit one from whatever machine is running it. The rest of the
 * suite leaves this to the default and passes, so this is insurance, not a fix.
 *
 * `theme` is left out to exercise the store's own default.
 */
async function seed(page: Page, theme?: string) {
    await page.addInitScript(
        ({ theme }: { theme?: string }) => {
            localStorage.setItem(
                "tdn-language",
                JSON.stringify({ state: { locale: "en" }, version: 0 }),
            );
            if (theme) {
                localStorage.setItem(
                    "tdn-theme",
                    JSON.stringify({ state: { theme }, version: 0 }),
                );
            }
        },
        { theme },
    );
}

const bodyBackground = (page: Page) =>
    page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test.describe("the stored theme decides the page", () => {
    test("light paints a white page", async ({ authenticatedPage: page }) => {
        await seed(page, "light");
        await stubApi(page);
        await page.goto("/");

        await expect(page.locator("html")).toHaveAttribute(
            "data-theme",
            "light",
        );
        expect(await bodyBackground(page)).toBe("rgb(255, 255, 255)");
    });

    test("dark paints a black page", async ({ authenticatedPage: page }) => {
        await seed(page, "dark");
        await stubApi(page);
        await page.goto("/");

        await expect(page.locator("html")).toHaveAttribute(
            "data-theme",
            "dark",
        );
        expect(await bodyBackground(page)).toBe("rgb(0, 0, 0)");
    });

    test("an account that never chose one gets the dark it has always had", async ({
        authenticatedPage: page,
    }) => {
        await seed(page);
        await stubApi(page);
        await page.goto("/");

        await expect(page.locator("html")).toHaveAttribute(
            "data-theme",
            "dark",
        );
    });
});

test.describe("'system' follows the operating system", () => {
    test.use({ colorScheme: "light" });

    test("resolves to light on a light desktop", async ({
        authenticatedPage: page,
    }) => {
        await seed(page, "system");
        await stubApi(page);
        await page.goto("/");

        await expect(page.locator("html")).toHaveAttribute(
            "data-theme",
            "light",
        );
        expect(await bodyBackground(page)).toBe("rgb(255, 255, 255)");
    });
});

test("the theme is stamped before the app is even loaded", async ({
    authenticatedPage: page,
}) => {
    /*
     * The whole point of the inline script in `index.html`: `persist` cannot
     * read localStorage until the bundle has downloaded and React has mounted,
     * and until then the stylesheet's default is dark — a black flash on every
     * cold load, for the one reader who asked not to have one.
     *
     * Blocking the modules is what makes that provable rather than a race.
     * Nothing of the app runs, so an attribute found here can only have come
     * from the inline script.
     */
    await seed(page, "light");
    await stubApi(page);
    // Every module, not just the entry: Vite serves them with a `?t=` cache
    // key, so a path-exact route misses and the app boots anyway — which is
    // what this test would then quietly stop proving.
    await page.route(/\.(tsx|ts|jsx|js|mjs)(\?|$)/, (route) => route.abort());

    await page.goto("/");

    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator("#root")).toBeEmpty();
});

test("a theme picked in settings survives a reload", async ({
    authenticatedPage: page,
}) => {
    await seed(page);
    await stubApi(page);
    await page.goto("/settings");

    await page.getByRole("button", { name: "Light" }).click();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(await bodyBackground(page)).toBe("rgb(255, 255, 255)");

    await page.reload();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(await bodyBackground(page)).toBe("rgb(255, 255, 255)");
});
