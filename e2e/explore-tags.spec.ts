import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import type { ArticleSummary } from "../src/features/article/api/article.types";
import type { Post } from "../src/features/feed/api/feed.types";

function makePost(id: string): Post {
    return {
        id,
        content: `Post ${id} about node`,
        type: "COMMUNITY",
        mediaUrls: [],
        createdAt: new Date().toISOString(),
        likeCount: 0,
        commentCount: 0,
        isLiked: false,
        isBookmarked: false,
        author: {
            id: "user-2",
            username: "bob",
            fullName: "Bob Builder",
            avatarUrl: "",
            isMe: false,
        },
        tags: [{ name: "nodejs" }],
    };
}

function makeSummary(id: string, title: string): ArticleSummary {
    return {
        id,
        slug: `slug-${id}`,
        title,
        excerpt: "Backpressure, and why it is not optional.",
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
        tags: [{ name: "nodejs" }],
        categories: [],
    };
}

/**
 * Posts and articles are separate endpoints, so each is recorded separately:
 * what this file is really about is that `tag` reaches `/articles` at all, and
 * that opening one tab does not fetch the other.
 */
async function stubTagged(page: Page) {
    const postRequests: string[] = [];
    const articleRequests: string[] = [];

    await page.route("**/api/v1/**", async (route, request) => {
        const url = new URL(request.url());
        const path = url.pathname;

        if (request.method() !== "GET") {
            await route.fulfill({ json: { meta: {} } });
            return;
        }
        if (path.endsWith("/articles")) {
            articleRequests.push(url.search);
            await route.fulfill({
                json: { data: [makeSummary("a1", "Node streams explained")] },
            });
            return;
        }
        if (path.endsWith("/posts")) {
            postRequests.push(url.search);
            await route.fulfill({ json: { data: [makePost("p1")] } });
            return;
        }
        // The right rail is on every page and reads `data.trends`, not a bare
        // array. A list here leaves it undefined and takes the whole route
        // down with it.
        if (path.endsWith("/tags/trends")) {
            await route.fulfill({ json: { data: { trends: [] } } });
            return;
        }
        await route.fulfill({ json: { data: [] } });
    });

    return { postRequests, articleRequests };
}

test.describe("A tag covers articles too", () => {
    test("the Articles tab lists articles carrying the tag", async ({
        authenticatedPage: page,
    }) => {
        const { articleRequests } = await stubTagged(page);
        await page.goto("/explore?tag=nodejs");

        await expect(page.getByText("Post p1 about node")).toBeVisible();

        await page.getByRole("button", { name: "Articles" }).click();

        await expect(page.getByText("Node streams explained")).toBeVisible();
        // The point of the whole change: the tag has to reach `/articles`.
        expect(articleRequests.some((s) => s.includes("tag=nodejs"))).toBe(
            true,
        );
    });

    test("the open tab is in the URL, so the articles view is a link", async ({
        authenticatedPage: page,
    }) => {
        const { postRequests } = await stubTagged(page);
        await page.goto("/explore?tag=nodejs&tab=articles");

        await expect(page.getByText("Node streams explained")).toBeVisible();
        // The post effect stands down, rather than fetching a list nothing
        // is going to render.
        expect(postRequests).toHaveLength(0);
    });

    test("switching tabs does not stack history entries", async ({
        authenticatedPage: page,
    }) => {
        await stubTagged(page);
        await page.goto("/explore?tag=nodejs");

        await page.getByRole("button", { name: "Articles" }).click();
        await expect(page.getByText("Node streams explained")).toBeVisible();
        await page.getByRole("button", { name: "Posts" }).click();
        await expect(page.getByText("Post p1 about node")).toBeVisible();

        // Back leaves the tag, rather than walking back through the tabs.
        await page.goBack();
        await expect(page).not.toHaveURL(/tag=nodejs/);
    });
});
