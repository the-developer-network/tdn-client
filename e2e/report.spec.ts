import { test as base, expect } from "@playwright/test";
import { test } from "./fixtures";
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
        quoteCount: 0,
        isSensitive: false,
        mediaPending: false,
        quotedPost: null,
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

test.describe("Reporting a post", () => {
    test("sends the reason and the free text, then says it arrived", async ({
        authenticatedPage: page,
    }) => {
        const bodies: string[] = [];

        await page.route("**/api/v1/**", async (route, request) => {
            const url = request.url();
            if (url.includes("/reports") && request.method() === "POST") {
                bodies.push(request.postData() ?? "");
                await route.fulfill({ json: { data: { received: true } } });
            } else if (url.includes("/posts") && request.method() === "GET") {
                await route.fulfill({ json: { data: [makePost("p1")] } });
            } else {
                await route.fulfill({ json: { data: null } });
            }
        });

        await page.goto("/");
        await page.getByRole("button", { name: "Report" }).first().click();

        await expect(
            page.getByRole("heading", { name: "Report this post" }),
        ).toBeVisible();
        await page.getByLabel("Spam or a scam").check();
        await page
            .getByLabel("Anything to add? (optional)")
            .fill("links to a phishing page");
        await page.getByRole("button", { name: "Send report" }).click();

        await expect(
            page.getByText("Your report has been received. Thank you."),
        ).toBeVisible();
        await expect(
            page.getByRole("heading", { name: "Report this post" }),
        ).toHaveCount(0);
        expect(JSON.parse(bodies[0] || "{}")).toEqual({
            targetKind: "POST",
            targetId: "p1",
            reason: "SPAM",
            details: "links to a phishing page",
        });
    });

    /*
     * Five a minute, and reporting several posts in a row is exactly the shape
     * that reaches it. The dialog has to survive the refusal holding what was
     * typed — closing it would ask somebody who did nothing wrong to pick the
     * reason and write the sentence again.
     */
    test("keeps the form, and what was typed, when the rate limit answers", async ({
        authenticatedPage: page,
    }) => {
        await page.route("**/api/v1/**", async (route, request) => {
            const url = request.url();
            if (url.includes("/reports") && request.method() === "POST") {
                await route.fulfill({
                    status: 429,
                    json: {
                        status: 429,
                        title: "TooManyRequestsError",
                        detail: "Rate limit exceeded, retry in 1 minute.",
                    },
                });
            } else if (url.includes("/posts") && request.method() === "GET") {
                await route.fulfill({ json: { data: [makePost("p1")] } });
            } else {
                await route.fulfill({ json: { data: null } });
            }
        });

        await page.goto("/");
        await page.getByRole("button", { name: "Report" }).first().click();
        await page.getByLabel("Hate speech").check();
        await page.getByRole("button", { name: "Send report" }).click();

        await expect(
            page.getByRole("heading", { name: "Report this post" }),
        ).toBeVisible();
        await expect(page.getByLabel("Hate speech")).toBeChecked();
        // The server's English is replaced here, one of the two sentences
        // `getErrorMessage` answers in its own words.
        await expect(
            page.getByText("Rate limit exceeded, retry in 1 minute."),
        ).toHaveCount(0);
    });

    test("offers no report control on your own post", async ({
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
                            makePost("p1", {
                                author: {
                                    id: "user-1",
                                    username: "alice",
                                    fullName: "Alice Smith",
                                    avatarUrl: "",
                                    isMe: true,
                                },
                            }),
                        ],
                    },
                });
            } else {
                await route.fulfill({ json: { data: null } });
            }
        });

        await page.goto("/");
        await expect(page.locator("article")).toHaveCount(1);

        await expect(page.getByRole("button", { name: "Report" })).toHaveCount(
            0,
        );
        await expect(
            page.getByRole("button", { name: "Delete post" }),
        ).toBeVisible();
    });
});

/*
 * Signed out on purpose, so the shared fixture is not used: the guard is the
 * whole subject, and an injected session would walk straight past it.
 */
base("a guest is asked to sign in before reporting", async ({ page }) => {
    await page.route("**/api/v1/**", async (route, request) => {
        if (request.url().includes("/posts") && request.method() === "GET") {
            await route.fulfill({ json: { data: [makePost("p1")] } });
        } else {
            await route.fulfill({ json: { data: null } });
        }
    });

    await page.goto("/");
    await page.getByRole("button", { name: "Report" }).first().click();

    await expect(
        page.getByRole("heading", { name: "Report this post" }),
    ).toHaveCount(0);
});
