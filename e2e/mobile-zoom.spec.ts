import { test, expect, mockUser } from "./fixtures";
import type { Page } from "@playwright/test";

/**
 * iOS Safari zooms the page in when it focuses a field rendering text under
 * 16px, and never zooms back out. The fix lives in `src/app/index.css` as one
 * rule for every field, because the per-field version had already been missed
 * once: the search box carried `text-[16px] sm:text-sm` while the comment and
 * post boxes still sat at 15px.
 *
 * These run at a phone viewport so the rule's `max-width` media query is the
 * one in play — at the desktop width the specs use elsewhere it does not apply
 * and the assertion would pass while proving nothing.
 */
test.use({ viewport: { width: 390, height: 844 } });

const MIN_FONT_SIZE = 16;

/**
 * Every field on screen, with the size it actually renders at. Reads
 * `getComputedStyle` rather than the class list — what matters is the pixel
 * value the browser resolved, whatever produced it.
 */
async function visibleFields(page: Page) {
    return page.evaluate(() => {
        const nodes = [
            ...document.querySelectorAll("input, textarea, select"),
        ] as HTMLElement[];

        return nodes
            .filter((el) => {
                const type = el.getAttribute("type");
                // Font size cannot zoom a control with no text in it.
                return (
                    type !== "checkbox" &&
                    type !== "radio" &&
                    type !== "hidden" &&
                    type !== "file"
                );
            })
            .filter((el) => el.offsetParent !== null)
            .map((el) => ({
                label:
                    el.getAttribute("placeholder") ||
                    el.getAttribute("name") ||
                    el.getAttribute("aria-label") ||
                    `${el.tagName.toLowerCase()}[${el.getAttribute("type") ?? "text"}]`,
                fontSize: parseFloat(getComputedStyle(el).fontSize),
            }));
    });
}

async function expectNoFieldZooms(page: Page, atLeast = 1) {
    const fields = await visibleFields(page);

    // Guards the assertion itself: a page that rendered no fields would pass
    // the loop below without testing anything.
    expect(fields.length).toBeGreaterThanOrEqual(atLeast);

    for (const field of fields) {
        expect(
            field.fontSize,
            `"${field.label}" renders at ${field.fontSize}px — iOS will zoom below ${MIN_FONT_SIZE}px`,
        ).toBeGreaterThanOrEqual(MIN_FONT_SIZE);
    }
}

function post(id: string) {
    return {
        id,
        content: "a post",
        type: "COMMUNITY",
        mediaUrls: [],
        createdAt: new Date().toISOString(),
        likeCount: 0,
        commentCount: 0,
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
    };
}

async function mockApi(page: Page) {
    await page.route("**/api/v1/**", async (route, request) => {
        const url = request.url();

        if (url.includes("/profiles/")) {
            await route.fulfill({
                json: { data: { ...mockUser, followingCount: 9 } },
            });
            // Comments live under /posts/:id/comments, so this has to be
            // matched before the post routes or it answers with one post
            // object where the list is expected.
        } else if (url.includes("/comments")) {
            await route.fulfill({ json: { data: [] } });
        } else if (url.includes("/posts/")) {
            await route.fulfill({ json: { data: post("p1") } });
        } else if (url.includes("/posts")) {
            await route.fulfill({ json: { data: [post("p1")] } });
        } else {
            await route.fulfill({ json: { data: null } });
        }
    });
}

test.describe("No field zooms the page on mobile", () => {
    test("the feed — search box and post box", async ({
        authenticatedPage: page,
    }) => {
        await mockApi(page);
        await page.goto("/");

        await expect(
            page.getByPlaceholder("What are you building today?"),
        ).toBeVisible();
        await expectNoFieldZooms(page, 2);
    });

    test("a post's comment box", async ({ authenticatedPage: page }) => {
        await mockApi(page);
        await page.goto("/post/p1");

        await expect(page.locator("textarea")).toBeVisible();
        await expectNoFieldZooms(page);
    });

    test("the sign-in modal", async ({ page }) => {
        await mockApi(page);
        await page.goto("/");
        // The sidebar is `hidden sm:block`, so at this width the way in is
        // BottomNav, whose profile tab opens the modal for a guest.
        await page.getByRole("button", { name: "Profile" }).click();

        await expect(
            page.getByPlaceholder("Phone, email, or username"),
        ).toBeVisible();
        await expectNoFieldZooms(page);
    });
});
