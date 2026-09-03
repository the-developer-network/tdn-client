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
        isSensitive: false,
        mediaPending: false,
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

const conversation = {
    id: "c1",
    status: "ACCEPTED",
    isRequest: false,
    canSend: true,
    participant: {
        id: "user-2",
        username: "bob",
        fullName: "Bob Builder",
        avatarUrl: "",
    },
    unreadCount: 0,
    lastMessagePreview: "the last thing said",
    lastMessageAt: new Date().toISOString(),
    otherLastReadAt: null,
    createdAt: new Date().toISOString(),
};

/** Enough of them to overflow the list, which is the point of the thread. */
const threadMessages = Array.from({ length: 20 }).map((_, i) => ({
    id: `m${i}`,
    conversationId: "c1",
    senderId: i % 2 ? "user-1" : "user-2",
    content:
        "A message long enough to wrap, so the bubble is measured at its widest rather than at a word.",
    mediaUrls: [] as string[],
    isSensitive: false,
    mediaPending: false,
    mediaRejected: false,
    isDeleted: false,
    isMine: i % 2 === 1,
    createdAt: new Date().toISOString(),
}));

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
        /*
         * Direct messaging. `meta` is not optional here the way it is for the
         * page-numbered endpoints: the listings go through `api.getPage`,
         * which reads `nextCursor` out of it.
         */
        if (url.includes("/conversations/unread-count")) {
            await route.fulfill({ json: { data: { count: 0 }, meta: {} } });
            return;
        }
        // Before the listing arm: a thread URL contains "/conversations" too.
        if (url.includes("/messages")) {
            await route.fulfill({
                json: {
                    data: { conversation, messages: threadMessages },
                    meta: { nextCursor: null },
                },
            });
            return;
        }
        if (url.includes("/conversations")) {
            await route.fulfill({
                json: {
                    data: url.includes("PENDING") ? [] : [conversation],
                    meta: { nextCursor: null },
                },
            });
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

/**
 * The conversation screen is the one page that owns the viewport instead of
 * growing the document: its header and composer are pinned and only the
 * messages between them scroll.
 *
 * It shipped without that working. `PageShell` gives `main` `min-h-screen`
 * and `pb-16` for the bottom bar, and the page set its own `h-[100dvh]` and
 * its own bottom padding on top — so at 390 the document came out 64px taller
 * than the screen, the header could be dragged away and a dead strip opened
 * under `BottomNav`. Measured rather than eyeballed, because that is a
 * difference no unit test can see.
 */
test.describe("the conversation screen", () => {
    test.describe("on a phone", () => {
        test.use({ viewport: { width: 390, height: 844 } });

        test("fills the viewport without scrolling the document", async ({
            authenticatedPage: page,
        }) => {
            await stubApi(page);
            await page.goto("/messages/c1");
            await expect(
                page.getByPlaceholder("Write a message"),
            ).toBeVisible();

            const scroll = await page.evaluate(() => ({
                doc: document.documentElement.scrollHeight,
                view: window.innerHeight,
            }));
            expect(scroll.doc).toBe(scroll.view);
            expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
        });

        test("keeps the composer above the bottom bar", async ({
            authenticatedPage: page,
        }) => {
            await stubApi(page);
            await page.goto("/messages/c1");

            const composer = await page
                .getByPlaceholder("Write a message")
                .boundingBox();
            const nav = await page.getByTestId("bottom-nav").boundingBox();

            expect(composer).not.toBeNull();
            expect(nav).not.toBeNull();
            expect(composer!.y + composer!.height).toBeLessThanOrEqual(nav!.y);
        });
    });

    /*
     * The rail is not decoration here. `PageShell` centres a fixed-width
     * block, so a page that leaves it out sits to the left of the space it
     * would have filled — which reads as a broken page rather than as an
     * uncluttered one, and is what made the missing rail worth reporting.
     */
    test.describe("on a desktop", () => {
        test.use({ viewport: { width: 1440, height: 900 } });

        test("keeps the trends rail, like every other page", async ({
            authenticatedPage: page,
        }) => {
            await stubApi(page);
            await page.goto("/messages/c1");

            await expect(page.getByText("Trending Topics")).toBeVisible();
            expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
        });
    });

    for (const [viewportName, viewport] of VIEWPORTS) {
        test.describe(`the inbox on ${viewportName}`, () => {
            test.use({ viewport });

            test("fits the screen", async ({ authenticatedPage: page }) => {
                await stubApi(page);
                await page.goto("/messages");
                await expect(page.getByText("Bob Builder")).toBeVisible();

                expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
            });
        });
    }
});

/**
 * The shell is centred as a block, so its container has to be the sum of the
 * columns in it and never a round number above them.
 *
 * Every column is fixed from `lg` up — 72 then 275 for the sidebar, 600 for
 * the column until `xl`, 320 for the rail — so anything beyond their sum
 * cannot be absorbed (`main` is capped) and lands as dead space at the right
 * end, with the layout packed left. The old 1250 did that across the whole
 * `lg` band: measured, a 1200px tablet had 208px of nothing to the right of
 * the trends rail, growing to 273px just before `xl`. It was reported from a
 * tablet, which is the only place it is impossible to miss.
 */
test.describe("the shell stays centred", () => {
    const WIDTHS = [1024, 1100, 1200, 1279, 1280, 1440, 1600];

    for (const width of WIDTHS) {
        test(`at ${width}px`, async ({ authenticatedPage: page }) => {
            await stubApi(page);
            await page.setViewportSize({ width, height: 800 });
            await page.goto("/");
            await expect(page.locator("article").first()).toBeVisible();

            /*
             * Measured on the columns, not on the container. The dead space
             * sat *inside* the container — at 1200 the container was
             * full-width, so its own margins were 0 and 0 and looked perfectly
             * centred while the rail ended 208px short of the right edge.
             * Asserting on the container passes on the broken layout, which is
             * worth saying because that is what this test asserted first.
             */
            const gaps = await page.evaluate(() => {
                const container =
                    document.querySelector("main")!.parentElement!;
                const first = container.firstElementChild!;
                const last = container.lastElementChild!;
                const viewport = document.documentElement.clientWidth;
                return {
                    left: Math.round(first.getBoundingClientRect().left),
                    right: Math.round(
                        viewport - last.getBoundingClientRect().right,
                    ),
                };
            });

            // One pixel of slack for an odd remainder, and no more: at 1200
            // this used to be 0 on the left against 208 on the right.
            expect(Math.abs(gaps.left - gaps.right)).toBeLessThanOrEqual(1);
        });
    }
});
