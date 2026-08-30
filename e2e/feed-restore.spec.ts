import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import type { Post, PostType } from "../src/features/feed/api/feed.types";

function makePost(id: string, type: PostType): Post {
    return {
        id,
        content: `${type} post ${id}`,
        type,
        mediaUrls: [],
        createdAt: new Date().toISOString(),
        likeCount: 0,
        commentCount: 0,
        isLiked: false,
        isBookmarked: false,
        quoteCount: 0,
        quotedPost: null,
        author: {
            id: "user-2",
            username: "bob",
            fullName: "Bob Builder",
            avatarUrl: "",
            isMe: false,
        },
        tags: [],
    };
}

/**
 * Every list request is answered from the `type` it asks for, so the rendered
 * text says which tab produced it. `pageRequests` counts them, which is how a
 * silent refetch is caught: restoring the feed and refetching it both end with
 * News posts on screen, and only the count tells them apart.
 */
async function mockFeed(page: Page) {
    const pageRequests: string[] = [];

    await page.route("**/api/v1/**", async (route, request) => {
        const url = new URL(request.url());
        const path = url.pathname;
        const method = request.method();

        if (path.endsWith("/posts") && method === "GET") {
            pageRequests.push(url.search);
            const type = (url.searchParams.get("type") ??
                "COMMUNITY") as PostType;
            const pageNo = Number(url.searchParams.get("page") ?? "1");
            // A full page of 20 keeps `hasMore` true so the ids stay unique
            // across pages and the column is tall enough to scroll.
            const posts = Array.from({ length: 20 }, (_, i) =>
                makePost(`${type}-${pageNo}-${i}`, type),
            );
            await route.fulfill({ json: { data: posts } });
            return;
        }
        // Before the single-post route below, which would otherwise swallow it.
        if (path.endsWith("/comments") && method === "GET") {
            await route.fulfill({ json: { data: [] } });
            return;
        }
        if (/\/posts\/[^/]+\/like$/.test(path)) {
            await route.fulfill({ json: { data: null } });
            return;
        }
        // The post page, so that opening a post and acting on it is a real
        // round trip rather than a "not found".
        const single = path.match(/\/posts\/([^/]+)$/);
        if (single && method === "GET") {
            const id = decodeURIComponent(single[1]);
            const type = (id.match(/^(.+)-\d+-\d+$/)?.[1] ??
                "COMMUNITY") as PostType;
            await route.fulfill({ json: { data: makePost(id, type) } });
            return;
        }
        await route.fulfill({ json: { data: null } });
    });

    return pageRequests;
}

test.describe("Returning to the feed", () => {
    test("keeps the tab you left instead of resetting to Community", async ({
        authenticatedPage: page,
    }) => {
        await mockFeed(page);
        await page.goto("/");

        await page.getByRole("button", { name: "News" }).click();
        await expect(
            page
                .locator("article")
                .first()
                .getByText(/TECH_NEWS post/),
        ).toBeVisible();

        await page.locator("article").first().click();
        await expect(page).toHaveURL(/\/post\//);

        await page.goBack();

        // The bug: FeedPage's `activeTab` is component state, so the remount
        // opens on Community and the reader loses the feed they were reading.
        await expect(
            page
                .locator("article")
                .first()
                .getByText(/TECH_NEWS post/),
        ).toBeVisible();
    });

    test("does not refetch the feed it already had", async ({
        authenticatedPage: page,
    }) => {
        const requests = await mockFeed(page);
        await page.goto("/");
        await page.locator("article").first().waitFor();

        const before = requests.length;

        await page.locator("article").first().click();
        await expect(page).toHaveURL(/\/post\//);
        await page.goBack();
        await page.locator("article").first().waitFor();

        expect(requests.length).toBe(before);
    });

    // Restoring is for Back only. Asking for the feed again — the Home link, a
    // notification — is a request to see it as it is now.
    test("asking for the feed again fetches a current one", async ({
        authenticatedPage: page,
    }) => {
        const requests = await mockFeed(page);
        await page.goto("/?tab=news");
        await page.locator("article").first().waitFor();

        await page.locator("article").first().click();
        await expect(page).toHaveURL(/\/post\//);
        const before = requests.length;

        await page.getByRole("link", { name: "Home" }).click();

        await expect(
            page
                .locator("article")
                .first()
                .getByText(/COMMUNITY post/),
        ).toBeVisible();
        expect(requests.length).toBeGreaterThan(before);
    });

    test("returns to the post you clicked, not to the top", async ({
        authenticatedPage: page,
    }) => {
        await mockFeed(page);
        await page.goto("/");
        await page.locator("article").first().waitFor();

        await page.locator("article").nth(12).scrollIntoViewIfNeeded();
        const target = page.locator("article").nth(12);
        const scrollBefore = await page.evaluate(() => window.scrollY);
        expect(scrollBefore).toBeGreaterThan(0);

        await target.click();
        await expect(page).toHaveURL(/\/post\//);
        await page.goBack();
        await page.locator("article").first().waitFor();

        const scrollAfter = await page.evaluate(() => window.scrollY);
        expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThan(100);
    });

    // Restoring means not refetching, so anything the reader changed while
    // they were away has to be written into the stored list by hand.
    test("shows a like made on the post page", async ({
        authenticatedPage: page,
    }) => {
        await mockFeed(page);
        await page.goto("/");
        await page.locator("article").first().waitFor();

        await page.locator("article").first().click();
        await expect(page).toHaveURL(/\/post\//);

        // By name, not by index — the action row grows.
        const likeButton = page
            .locator("article")
            .first()
            .getByRole("button", { name: "Like post" });
        await likeButton.click();
        await expect(likeButton.locator("span")).toHaveText("1");

        await page.goBack();

        await expect(
            page
                .locator("article")
                .first()
                .getByRole("button", { name: "Like post" })
                .locator("span"),
        ).toHaveText("1");
    });
});
