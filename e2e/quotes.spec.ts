import { test, expect } from "./fixtures";
import type { Post, QuotedPost } from "../src/features/feed/api/feed.types";

const quoted: QuotedPost = {
    id: "original-1",
    content: "the original take",
    mediaUrls: [],
    createdAt: new Date().toISOString(),
    author: {
        id: "user-2",
        username: "bob",
        fullName: "Bob Builder",
        avatarUrl: "",
    },
};

function makePost(id: string, overrides: Partial<Post> = {}): Post {
    return {
        id,
        content: "This is a test post",
        type: "COMMUNITY",
        mediaUrls: [],
        createdAt: new Date().toISOString(),
        likeCount: 5,
        commentCount: 2,
        quoteCount: 0,
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
        quotedPost: null,
        ...overrides,
    };
}

test.describe("Quotes", () => {
    test("renders the embedded card on a post that quotes another", async ({
        authenticatedPage: page,
    }) => {
        await page.route("**/api/v1/**", async (route, request) => {
            if (
                request.url().includes("/posts") &&
                request.method() === "GET"
            ) {
                await route.fulfill({
                    json: {
                        data: [
                            makePost("q1", {
                                content: "buna katiliyorum",
                                quotedPost: quoted,
                            }),
                        ],
                    },
                });
            } else {
                await route.fulfill({ json: { data: null } });
            }
        });

        await page.goto("/");

        await expect(page.getByText("buna katiliyorum")).toBeVisible();
        await expect(page.getByText("the original take")).toBeVisible();
    });

    test("draws a quote with no text as a repost", async ({
        authenticatedPage: page,
    }) => {
        await page.route("**/api/v1/**", async (route, request) => {
            if (
                request.url().includes("/posts") &&
                request.method() === "GET"
            ) {
                await route.fulfill({
                    json: {
                        data: [
                            makePost("q1", {
                                content: "",
                                quotedPost: quoted,
                            }),
                        ],
                    },
                });
            } else {
                await route.fulfill({ json: { data: null } });
            }
        });

        await page.goto("/");

        await expect(page.getByText("reposted")).toBeVisible();
        await expect(page.getByText("the original take")).toBeVisible();
    });

    test("the quote badge opens the list of quoting posts", async ({
        authenticatedPage: page,
    }) => {
        await page.route("**/api/v1/**", async (route, request) => {
            const url = request.url();
            if (url.includes("/quotes") && request.method() === "GET") {
                await route.fulfill({
                    json: {
                        data: [
                            makePost("q1", {
                                content: "quoting it",
                                quotedPost: quoted,
                            }),
                        ],
                    },
                });
            } else if (url.includes("/posts") && request.method() === "GET") {
                await route.fulfill({
                    json: { data: [makePost("original-1", { quoteCount: 3 })] },
                });
            } else {
                await route.fulfill({ json: { data: null } });
            }
        });

        await page.goto("/");
        await page.getByRole("button", { name: "View quotes" }).click();

        await expect(page).toHaveURL(/\/posts\/original-1\/quotes$/);
        await expect(page.getByText("quoting it")).toBeVisible();
    });

    test("the quotes page shows its own empty state", async ({
        authenticatedPage: page,
    }) => {
        await page.route("**/api/v1/**", async (route, request) => {
            if (request.url().includes("/quotes")) {
                await route.fulfill({ json: { data: [] } });
            } else {
                await route.fulfill({ json: { data: null } });
            }
        });

        await page.goto("/posts/original-1/quotes");

        await expect(page.getByText("No quotes yet")).toBeVisible();
    });

    test("quoting from the feed posts quotedPostId and shows the new quote right away", async ({
        authenticatedPage: page,
    }) => {
        let createBody: Record<string, unknown> | null = null;

        await page.route("**/api/v1/**", async (route, request) => {
            const url = request.url();
            if (url.includes("/posts") && request.method() === "POST") {
                createBody = request.postDataJSON() as Record<string, unknown>;
                await route.fulfill({
                    json: {
                        data: makePost("new-quote", {
                            content: "buna katiliyorum",
                            quotedPost: quoted,
                            author: {
                                id: "user-1",
                                username: "alice",
                                fullName: "Alice Smith",
                                avatarUrl: "",
                                isMe: true,
                            },
                        }),
                    },
                });
            } else if (url.includes("/posts") && request.method() === "GET") {
                await route.fulfill({
                    json: { data: [makePost("original-1")] },
                });
            } else {
                await route.fulfill({ json: { data: null } });
            }
        });

        await page.goto("/");
        await page.getByRole("button", { name: "Quote post" }).click();

        await page
            .getByPlaceholder("Add a comment (optional)")
            .fill("buna katiliyorum");
        await page.getByRole("button", { name: "Quote", exact: true }).click();

        // The feed is cached for 60 s server-side, so the row has to come from
        // the create response rather than from a refetch.
        await expect(page.getByText("buna katiliyorum")).toBeVisible();
        expect(createBody).toMatchObject({
            content: "buna katiliyorum",
            quotedPostId: "original-1",
        });
    });
});
