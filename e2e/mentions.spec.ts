import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";
import type { Post } from "../src/features/feed/api/feed.types";

/**
 * Mentions end to end. The rendering rule is the one worth holding here: the
 * API returns the body unchanged and says separately which handles name a real
 * account, so a handle with an entry links and one without stays text. That
 * pairing is the client's, and it is not something a unit test on the parser
 * can show — it needs the card, the router and a real click.
 */
function makePost(overrides: Partial<Post> = {}): Post {
    return {
        id: "p1",
        content: "hello",
        type: "COMMUNITY",
        mediaUrls: [],
        createdAt: new Date().toISOString(),
        likeCount: 0,
        commentCount: 0,
        quoteCount: 0,
        isSensitive: false,
        mediaPending: false,
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
        mentions: [],
        quotedPost: null,
        ...overrides,
    };
}

const profile = {
    id: "user-3",
    username: "ada",
    fullName: "Ada L.",
    bio: "",
    location: "",
    avatarUrl: "",
    bannerUrl: "",
    socials: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    followersCount: 0,
    followingCount: 0,
    postCount: 0,
    isMe: false,
    isFollowing: false,
    tags: [],
    mentions: [],
};

async function stub(page: Page, posts: Post[]) {
    await page.route("**/api/v1/**", async (route, request) => {
        const url = request.url();
        if (url.includes("/profiles/search")) {
            await route.fulfill({ json: { data: [profile] } });
            return;
        }
        if (url.includes("/profiles/ada")) {
            await route.fulfill({ json: { data: profile } });
            return;
        }
        if (url.includes("/posts") && request.method() === "GET") {
            await route.fulfill({ json: { data: posts } });
            return;
        }
        await route.fulfill({ json: { data: [], meta: {} } });
    });
}

test.describe("Mentions", () => {
    test("links a resolved handle and opens the profile", async ({
        authenticatedPage: page,
    }) => {
        await stub(page, [
            makePost({
                content: "good point @ada",
                mentions: [{ id: "user-3", username: "ada" }],
            }),
        ]);

        await page.goto("/");

        const link = page.getByRole("link", { name: "@ada" });
        await expect(link).toBeVisible();
        await link.click();

        await expect(page).toHaveURL(/\/profile\/ada$/);
    });

    /*
     * A handle nobody owns is dropped silently by the API — the write still
     * succeeds — so the body keeps text that names no account. Linking it
     * anyway would send readers to a profile that does not exist.
     */
    test("leaves a handle nobody owns as plain text", async ({
        authenticatedPage: page,
    }) => {
        await stub(page, [
            makePost({ content: "good point @nobody", mentions: [] }),
        ]);

        await page.goto("/");

        await expect(page.getByText("good point @nobody")).toBeVisible();
        await expect(page.getByRole("link", { name: "@nobody" })).toHaveCount(
            0,
        );
    });

    test("does not turn an email address into a mention", async ({
        authenticatedPage: page,
    }) => {
        await stub(page, [
            makePost({
                content: "write to ada@example.com",
                mentions: [{ id: "user-3", username: "ada" }],
            }),
        ]);

        await page.goto("/");

        await expect(page.getByText("write to ada@example.com")).toBeVisible();
        await expect(page.getByRole("link", { name: "@ada" })).toHaveCount(0);
    });

    /*
     * The server refuses a body naming more than ten distinct accounts with a
     * 400. The composer counts the same way so that answer is never reached —
     * the same approach the message composer takes with its character cap.
     */
    test("refuses to post more than ten mentions", async ({
        authenticatedPage: page,
    }) => {
        await stub(page, []);
        await page.goto("/");

        const eleven = Array.from({ length: 11 }, (_, i) => `@user${i}`).join(
            " ",
        );
        await page.getByPlaceholder(/building/i).fill(eleven);

        await expect(page.getByText(/up to 10 people/i)).toBeVisible();
        await expect(page.getByRole("button", { name: "Post" })).toBeDisabled();
    });

    /*
     * The write side. There is no mention-search endpoint — the API doc says
     * to use profile search — so this is that list, driven from the caret.
     */
    test("suggests accounts while an @handle is typed", async ({
        authenticatedPage: page,
    }) => {
        await stub(page, []);
        await page.goto("/");

        const box = page.getByPlaceholder(/building/i);
        await box.click();
        await box.type("hey @ad");

        const option = page.getByRole("option", { name: /Ada L\./ });
        await expect(option).toBeVisible();
        await option.click();

        // The handle is completed and a space follows it, so the next word
        // does not reopen the list on the character meant to end it.
        await expect(box).toHaveValue("hey @ada ");
    });

    test("completes the highlighted account with the keyboard", async ({
        authenticatedPage: page,
    }) => {
        await stub(page, []);
        await page.goto("/");

        const box = page.getByPlaceholder(/building/i);
        await box.click();
        await box.type("hey @ad");
        await expect(page.getByRole("option")).toBeVisible();

        // Enter belongs to the list while it is open, not to the newline.
        await box.press("Enter");

        await expect(box).toHaveValue("hey @ada ");
    });

    // Suggesting accounts inside an email address would offer a link that can
    // never exist — the same rule the renderer applies.
    test("does not suggest inside an email address", async ({
        authenticatedPage: page,
    }) => {
        await stub(page, []);
        await page.goto("/");

        const box = page.getByPlaceholder(/building/i);
        await box.click();
        await box.type("write to ada@exa");

        await expect(page.getByRole("option")).toHaveCount(0);
    });
});
