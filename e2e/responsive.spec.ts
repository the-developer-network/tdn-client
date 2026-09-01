import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import type { Post } from "../src/features/feed/api/feed.types";
import type { Article } from "../src/features/article/api/article.types";
import type { Profile } from "../src/features/profile/api/profile.types";

/**
 * The layout ladder, checked at the widths it exists for. Every one of these
 * pages used to run off the right edge of the screen at one width or another:
 * the post card's action row on a phone, the whole reading column on a tablet.
 *
 * A unit test cannot catch either. Both are the browser resolving widths
 * against a real viewport, and jsdom reports every element as 0×0.
 */

const author = {
    id: "user-2",
    username: "bob",
    fullName: "Bob Builder",
    avatarUrl: "",
    isMe: false,
};

/**
 * Deliberately awkward content: the counters are wide enough to push the
 * action row, and the link is one unbreakable token. Both are what made the
 * card overflow at 390px.
 */
function makePost(id: string): Post {
    return {
        id,
        content:
            "A post long enough to wrap, carrying a link that cannot: " +
            "https://developernetwork.net/some/really/long/link/that/never/breaks",
        type: "COMMUNITY",
        mediaUrls: [],
        createdAt: new Date().toISOString(),
        likeCount: 1250,
        commentCount: 340,
        quoteCount: 12,
        isLiked: false,
        isBookmarked: false,
        author,
        tags: [],
        quotedPost: null,
    };
}

const profile: Profile = {
    id: "user-2",
    userId: "user-2",
    username: "bob",
    fullName: "Bob Builder",
    bio: "Software developer",
    location: "Istanbul",
    avatarUrl: "",
    bannerUrl: "",
    socials: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    followersCount: 12400,
    followingCount: 530,
    postCount: 33,
    isMe: false,
    isFollowing: false,
};

const article: Article = {
    id: "a1",
    slug: "responsive",
    title: "A title long enough to need the whole reading column to itself",
    excerpt: "Short summary.",
    coverImageUrl: null,
    coverImageAlt: null,
    readingTimeMinutes: 6,
    likeCount: 12,
    commentCount: 3,
    isLiked: false,
    isBookmarked: false,
    status: "PUBLISHED",
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    author,
    tags: [],
    categories: [],
    body:
        "## Heading\n\nBody text that wraps.\n\n```js\n" +
        "const aVeryLongLineOfCodeThatWillNotWrapOnItsOwn = call(one, two, three);\n" +
        "```\n",
};

async function stubApi(page: Page) {
    await page.route("**/api/v1/**", async (route, request) => {
        const url = request.url();
        if (request.method() !== "GET") {
            await route.fulfill({ json: { meta: {} } });
            return;
        }
        if (url.includes("/tags/trends")) {
            await route.fulfill({
                json: {
                    data: {
                        trends: [
                            {
                                tag: "react",
                                postCount: 1204,
                                category: "FRONTEND",
                            },
                        ],
                    },
                },
            });
            return;
        }
        if (url.includes("/profiles/bob")) {
            await route.fulfill({ json: { data: profile } });
            return;
        }
        // Checked before the list, since a detail URL also contains
        // "/articles".
        if (/\/articles\/[^/?]+(\?|$)/.test(url)) {
            await route.fulfill({ json: { data: article } });
            return;
        }
        if (url.includes("/posts") || url.includes("/articles")) {
            await route.fulfill({
                json: { data: [makePost("p1"), makePost("p2")] },
            });
            return;
        }
        await route.fulfill({ json: { data: [] } });
    });
}

/** How far the document scrolls sideways. Zero on a page that fits. */
async function horizontalOverflow(page: Page) {
    return page.evaluate(() => {
        const el = document.documentElement;
        return el.scrollWidth - el.clientWidth;
    });
}

const PAGES = [
    ["the feed", "/"],
    ["a profile", "/profile/bob"],
    ["an article", "/articles/responsive"],
] as const;

const VIEWPORTS = [
    ["a phone", { width: 390, height: 844 }],
    // The narrowest phone still in use. The action row has to give way rather
    // than push the card wider than the screen.
    ["a small phone", { width: 320, height: 700 }],
    ["a tablet held upright", { width: 768, height: 1024 }],
    ["a tablet turned sideways", { width: 1024, height: 768 }],
] as const;

for (const [viewportName, viewport] of VIEWPORTS) {
    test.describe(`on ${viewportName}`, () => {
        test.use({ viewport });

        for (const [pageName, path] of PAGES) {
            test(`${pageName} fits the screen`, async ({
                authenticatedPage: page,
            }) => {
                await stubApi(page);
                await page.goto(path);
                // The card is what overflows, so waiting on `main` would
                // measure an empty column and pass on a broken page. Every
                // one of these three renders its content in an `article`.
                await expect(page.locator("article").first()).toBeVisible();

                expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
            });
        }
    });
}

test.describe("the sidebar / bottom-nav changeover", () => {
    test.describe("on a phone", () => {
        test.use({ viewport: { width: 390, height: 844 } });

        test("navigates from the bottom bar, with no sidebar", async ({
            authenticatedPage: page,
        }) => {
            await stubApi(page);
            await page.goto("/");

            await expect(page.getByTestId("bottom-nav")).toBeVisible();
            await expect(page.locator("aside").first()).toBeHidden();
        });
    });

    test.describe("on a tablet held upright", () => {
        test.use({ viewport: { width: 768, height: 1024 } });

        // The changeover used to sit at 640, where the sidebar took 220 of the
        // 640 and left the feed 420 — narrower than the same feed gets on a
        // phone, which at least has the whole screen.
        test("navigates from the sidebar, with no bottom bar", async ({
            authenticatedPage: page,
        }) => {
            await stubApi(page);
            await page.goto("/");

            await expect(page.locator("aside").first()).toBeVisible();
            await expect(page.getByTestId("bottom-nav")).toBeHidden();
        });

        // Settings sits behind a hover popup on the desktop sidebar, and a
        // tablet has no hover. The phone reaches it from the profile page;
        // between the two, every tablet width had no way in at all.
        test("reaches settings from the sidebar", async ({
            authenticatedPage: page,
        }) => {
            await stubApi(page);
            await page.goto("/");

            await page
                .locator("aside")
                .first()
                .getByRole("link", {
                    name: /settings|ayarlar/i,
                })
                .click();

            await expect(page).toHaveURL(/\/settings$/);
        });
    });
});
