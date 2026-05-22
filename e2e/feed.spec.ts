import { test, expect } from "./fixtures";
import type { Post } from "../src/features/feed/api/feed.types";

function makePost(id: string, overrides: Partial<Post> = {}): Post {
    return {
        id,
        content: "This is a test post",
        type: "COMMUNITY",
        mediaUrls: [],
        createdAt: new Date().toISOString(),
        likeCount: 5,
        commentCount: 2,
        isLiked: false,
        isBookmarked: false,
        author: {
            id: "user-2",
            username: "bob",
            fullName: "Bob Builder",
            avatarUrl: "",
            isMe: false,
        },
        tags: [],
        ...overrides,
    };
}

test.describe("Feed page", () => {
    test("renders posts returned by the API", async ({
        authenticatedPage: page,
    }) => {
        await page.route("**/api/v1/**", async (route, request) => {
            if (
                request.url().includes("/posts") &&
                request.method() === "GET"
            ) {
                await route.fulfill({
                    json: { data: [makePost("p1"), makePost("p2")] },
                });
            } else {
                await route.fulfill({ json: { data: null } });
            }
        });

        await page.goto("/");

        await expect(page.locator("article")).toHaveCount(2);
    });

    test("clicking News tab requests posts with type=TECH_NEWS", async ({
        authenticatedPage: page,
    }) => {
        await page.route("**/api/v1/**", async (route, request) => {
            if (
                request.url().includes("/posts") &&
                request.method() === "GET"
            ) {
                await route.fulfill({ json: { data: [] } });
            } else {
                await route.fulfill({ json: { data: null } });
            }
        });

        await page.goto("/");

        const techNewsRequest = page.waitForRequest((req) =>
            req.url().includes("type=TECH_NEWS"),
        );

        await page.getByRole("button", { name: "News" }).click();

        const req = await techNewsRequest;
        expect(req.url()).toContain("type=TECH_NEWS");
    });

    test("clicking like triggers an optimistic count update", async ({
        authenticatedPage: page,
    }) => {
        await page.route("**/api/v1/**", async (route, request) => {
            const url = request.url();
            const method = request.method();
            if (url.includes("/posts") && method === "GET") {
                await route.fulfill({
                    json: { data: [makePost("p1", { likeCount: 5 })] },
                });
            } else if (/\/posts\/[^/]+\/like/.test(url) && method === "POST") {
                await route.fulfill({ json: { data: null } });
            } else {
                await route.fulfill({ json: { data: null } });
            }
        });

        await page.goto("/");
        await page.locator("article").first().waitFor();

        // Like button is the second action button in the article (index 1)
        const likeButton = page.locator("article").first().locator("button").nth(1);
        await likeButton.click();

        // Optimistic update: 5 → 6
        await expect(likeButton.locator("span")).toHaveText("6");
    });
});
