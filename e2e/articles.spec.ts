import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import type {
    Article,
    ArticleSummary,
} from "../src/features/article/api/article.types";

function makeSummary(
    id: string,
    overrides: Partial<ArticleSummary> = {},
): ArticleSummary {
    return {
        id,
        slug: `slug-${id}`,
        title: `Article ${id}`,
        excerpt: "Keeping transport concerns out of the domain layer.",
        coverImageUrl: null,
        coverImageAlt: null,
        readingTimeMinutes: 7,
        likeCount: 5,
        commentCount: 2,
        isLiked: false,
        isBookmarked: false,
        status: "PUBLISHED",
        publishedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        author: {
            id: "user-2",
            username: "bob",
            fullName: "Bob Builder",
            avatarUrl: "",
            isMe: false,
        },
        tags: [],
        categories: [],
        ...overrides,
    };
}

function makeArticle(id: string, overrides: Partial<Article> = {}): Article {
    return {
        ...makeSummary(id),
        body: "# Heading\n\nSome **bold** body text.",
        ...overrides,
    };
}

/**
 * Routes every article read. The order matters: the detail path is matched
 * first, because `/articles/:slug` also contains `/articles`.
 */
async function stubArticles(
    page: Page,
    options: {
        list?: ArticleSummary[];
        detail?: Article;
    } = {},
) {
    const list = options.list ?? [makeSummary("a1"), makeSummary("a2")];
    const detail = options.detail ?? makeArticle("a1");

    await page.route("**/api/v1/**", async (route, request) => {
        const url = request.url();
        // Like and bookmark answer `{ meta }` with no data of their own.
        if (request.method() !== "GET") {
            await route.fulfill({ json: { meta: {} } });
            return;
        }
        if (/\/articles\/[^/?]+\/comments/.test(url)) {
            await route.fulfill({ json: { data: [] } });
            return;
        }
        // Checked before the list, since a detail URL also contains
        // "/articles".
        if (/\/articles\/[^/?]+(\?|$)/.test(url)) {
            await route.fulfill({ json: { data: detail } });
            return;
        }
        if (url.includes("/articles")) {
            await route.fulfill({ json: { data: list } });
            return;
        }
        // The right rail is mounted on both article pages and reads this;
        // it wants an object, and a bare array leaves the widget crashing on
        // `undefined.length`.
        if (url.includes("/tags/trends")) {
            await route.fulfill({ json: { data: { trends: [] } } });
            return;
        }
        await route.fulfill({ json: { data: [] } });
    });
}

/**
 * The article list lives behind the fourth feed tab rather than a route of its
 * own, so every list assertion starts from "/" and opens the tab.
 */
async function openArticlesTab(page: Page) {
    await page.goto("/");
    await page.getByRole("button", { name: "Articles" }).click();
}

test.describe("Articles", () => {
    test("lists the articles the API returned", async ({
        authenticatedPage: page,
    }) => {
        await stubArticles(page);

        await openArticlesTab(page);

        await expect(page.locator("article")).toHaveCount(2);
        await expect(
            page.getByRole("heading", { name: "Article a1" }),
        ).toBeVisible();
    });

    test("sits fourth in the feed tabs, where Jobs used to be", async ({
        authenticatedPage: page,
    }) => {
        await page.route("**/api/v1/**", async (route, request) => {
            if (request.url().includes("/tags/trends")) {
                await route.fulfill({ json: { data: { trends: [] } } });
                return;
            }
            await route.fulfill({ json: { data: [] } });
        });

        await page.goto("/");

        await expect(page.getByRole("button", { name: "Jobs" })).toHaveCount(0);
        await expect(
            page.getByRole("button", { name: "Articles" }),
        ).toBeVisible();

        // Position is the point: Articles took the slot Jobs used to hold, so
        // the strip has to read Community, News, Updates, Articles in that
        // order. Compared by DOM index rather than by CSS, which would break
        // on any restyle.
        const labels = await page.getByRole("button").allInnerTexts();
        const order = ["Community", "News", "Updates", "Articles"].map((name) =>
            labels.indexOf(name),
        );
        expect(order.every((index) => index >= 0)).toBe(true);
        expect(order).toEqual([...order].sort((a, b) => a - b));
    });

    test("narrowing by category asks the API for it", async ({
        authenticatedPage: page,
    }) => {
        await stubArticles(page, { list: [] });

        await openArticlesTab(page);

        const filtered = page.waitForRequest((req) =>
            req.url().includes("categories=BACKEND"),
        );
        await page.getByRole("button", { name: "Backend" }).click();

        expect((await filtered).url()).toContain("categories=BACKEND");
    });

    test("opening an article renders its markdown body", async ({
        authenticatedPage: page,
    }) => {
        await stubArticles(page);

        await openArticlesTab(page);
        await page.getByRole("heading", { name: "Article a1" }).click();

        await expect(page).toHaveURL(/\/articles\/slug-a1$/);
        // The body arrives as raw markdown; these assert it was rendered as
        // elements rather than printed as literal `#` and `**`.
        await expect(
            page.getByRole("heading", { name: "Heading" }),
        ).toBeVisible();
        await expect(page.locator("article strong")).toHaveText("bold");
    });

    test("a body carrying raw HTML is not executed", async ({
        authenticatedPage: page,
    }) => {
        await stubArticles(page, {
            detail: makeArticle("a1", {
                body: 'Hello\n\n<img src="x" onerror="window.__pwned = true">',
            }),
        });

        await page.goto("/articles/slug-a1");

        await expect(page.getByText("Hello")).toBeVisible();
        expect(await page.locator("img[onerror]").count()).toBe(0);
        expect(await page.evaluate(() => "__pwned" in window)).toBe(false);
    });

    test("liking updates the count before the request settles", async ({
        authenticatedPage: page,
    }) => {
        await stubArticles(page);

        await page.goto("/articles/slug-a1");

        const like = page.getByRole("button", { name: "Like article" });
        await expect(like).toContainText("5");

        await like.click();

        await expect(like).toContainText("6");
    });

    test("a missing article shows not-found, never a draft hint", async ({
        authenticatedPage: page,
    }) => {
        await page.route("**/api/v1/**", async (route, request) => {
            if (/\/articles\/[^/?]+(\?|$)/.test(request.url())) {
                await route.fulfill({
                    status: 404,
                    json: {
                        type: "about:blank",
                        title: "ArticleNotFoundError",
                        status: 404,
                        detail: "Article not found.",
                        instance: "/api/v1/articles/x",
                    },
                });
                return;
            }
            if (request.url().includes("/tags/trends")) {
                await route.fulfill({ json: { data: { trends: [] } } });
                return;
            }
            await route.fulfill({ json: { data: [] } });
        });

        await page.goto("/articles/someone-elses-draft");

        await expect(page.getByText("Article not found.")).toBeVisible();
        await expect(page.getByText(/unpublished|draft/i)).toHaveCount(0);
    });
});
