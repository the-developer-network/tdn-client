import type { Page, Route, Request as PwRequest } from "@playwright/test";
import { test, expect } from "./fixtures";

const draft = {
    id: "article-1",
    slug: "my-first-article",
    title: "My First Article",
    excerpt: "",
    body: "",
    coverImageUrl: null,
    coverImageAlt: null,
    readingTimeMinutes: 1,
    likeCount: 0,
    commentCount: 0,
    isLiked: false,
    isBookmarked: false,
    status: "DRAFT",
    publishedAt: null,
    createdAt: new Date().toISOString(),
    author: {
        id: "user-1",
        username: "alice",
        fullName: "Alice Smith",
        avatarUrl: "",
        isMe: true,
    },
    tags: [],
    categories: [],
};

/** Records every write so the request sequence can be asserted, not assumed. */
async function stubEditor(page: Page) {
    const calls: { method: string; path: string }[] = [];

    await page.route(
        "**/api/v1/**",
        async (route: Route, request: PwRequest) => {
            const path = new URL(request.url()).pathname;
            const method = request.method();

            if (method !== "GET") calls.push({ method, path });

            if (request.url().includes("/tags/trends")) {
                await route.fulfill({ json: { data: { trends: [] } } });
                return;
            }
            if (path.endsWith("/publish")) {
                await route.fulfill({
                    json: { data: { ...draft, status: "PUBLISHED" } },
                });
                return;
            }
            if (path === "/api/v1/articles" && method === "POST") {
                await route.fulfill({ json: { data: draft } });
                return;
            }
            if (method === "PATCH") {
                await route.fulfill({ json: { data: draft } });
                return;
            }
            if (/\/articles\/[^/]+$/.test(path) && method === "GET") {
                await route.fulfill({
                    json: { data: { ...draft, status: "PUBLISHED" } },
                });
                return;
            }
            await route.fulfill({ json: { data: [] } });
        },
    );

    return calls;
}

test.describe("Article editor", () => {
    test("writes, previews and publishes", async ({
        authenticatedPage: page,
    }) => {
        const calls = await stubEditor(page);

        await page.goto("/articles/new");

        await page.getByLabel("Title").fill("My First Article");
        await page
            .getByLabel("Write your article in Markdown...")
            .fill("# Heading\n\nSome **bold** text.");

        // The preview runs the same renderer the reading page does, so what is
        // on screen here is what a reader will get.
        await page.getByRole("button", { name: "Preview" }).click();
        await expect(
            page.getByRole("heading", { name: "Heading" }),
        ).toBeVisible();
        await expect(page.locator("strong")).toHaveText("bold");

        await page.getByRole("button", { name: "Publish" }).click();

        await expect(page).toHaveURL(/\/articles\/my-first-article$/);

        // Created once, then published — never created twice, which would
        // orphan the first draft and spend the rate limit.
        const creates = calls.filter(
            (c) => c.method === "POST" && c.path === "/api/v1/articles",
        );
        expect(creates).toHaveLength(1);
        expect(calls.some((c) => c.path.endsWith("/publish"))).toBe(true);
    });

    test("cannot publish before there is a title and a body", async ({
        authenticatedPage: page,
    }) => {
        await stubEditor(page);

        await page.goto("/articles/new");

        await expect(
            page.getByRole("button", { name: "Publish" }),
        ).toBeDisabled();
        await expect(
            page.getByText(
                "A title and some body text are needed before this can be saved.",
            ),
        ).toBeVisible();

        await page.getByLabel("Title").fill("Only a title");
        await expect(
            page.getByRole("button", { name: "Publish" }),
        ).toBeDisabled();
    });

    test("normalises a tag to what the server will accept", async ({
        authenticatedPage: page,
    }) => {
        await stubEditor(page);

        await page.goto("/articles/new");
        await page.getByLabel("Tags").fill("Yazılım Mimarisi");
        await page.getByLabel("Tags").press("Enter");

        // Turkish letters and spaces are both rejected by the server pattern,
        // and its 400 never names the field — so the fix happens here.
        await expect(page.getByText("#yazilim-mimarisi")).toBeVisible();
    });

    test("a guest is sent home rather than into the editor", async ({
        page,
    }) => {
        await page.route("**/api/v1/**", async (route) => {
            if (route.request().url().includes("/tags/trends")) {
                await route.fulfill({ json: { data: { trends: [] } } });
                return;
            }
            await route.fulfill({ json: { data: [] } });
        });

        await page.goto("/articles/new");

        await expect(page).toHaveURL(/\/$/);
    });
});
