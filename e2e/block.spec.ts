import { test, expect } from "./fixtures";
import type { Profile } from "../src/features/profile/api/profile.types";

const bob: Profile = {
    id: "user-2",
    username: "bob",
    fullName: "Bob Builder",
    bio: "Software developer",
    location: "",
    avatarUrl: "",
    bannerUrl: "",
    socials: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    followersCount: 10,
    followingCount: 5,
    postCount: 3,
    isMe: false,
    isFollowing: false,
    isBlocked: false,
    isBlockedBy: false,
};

test.describe("Blocking from a profile", () => {
    /*
     * The block is written and then the page re-reads: the server also drops
     * both follows and answers the counts as zero, so the second read is the
     * only honest source for what the header should now say.
     */
    test("blocks an account and offers the way back", async ({
        authenticatedPage: page,
    }) => {
        let blocked = false;
        const blockRequests: string[] = [];

        await page.route("**/api/v1/**", async (route, request) => {
            const url = request.url();
            if (url.includes("/blocks") && request.method() === "POST") {
                blockRequests.push(request.postData() ?? "");
                blocked = true;
                await route.fulfill({ json: { data: { isBlocked: true } } });
            } else if (url.includes("/profiles/bob")) {
                await route.fulfill({
                    json: {
                        data: {
                            ...bob,
                            isBlocked: blocked,
                            postCount: blocked ? 0 : bob.postCount,
                        },
                    },
                });
            } else if (url.includes("/users/bob/posts")) {
                await route.fulfill({ json: { data: [] } });
            } else {
                await route.fulfill({ json: { data: [] } });
            }
        });

        await page.goto("/profile/bob");

        await page.getByRole("button", { name: "Block" }).click();
        // Blocking asks first: it hides an account from a reader who then has
        // no way of telling that it worked from that it did not.
        await expect(page.getByText("Block @bob?")).toBeVisible();
        await page
            .getByRole("button", { name: "Block", exact: true })
            .last()
            .click();

        await expect(page.getByText("You blocked @bob")).toBeVisible();
        await expect(
            page.getByRole("button", { name: "Unblock" }),
        ).toBeVisible();
        expect(blockRequests).toEqual([JSON.stringify({ targetId: "user-2" })]);

        // The timeline of a blocked account comes back empty, and an empty tab
        // would read as an account that has never written anything.
        await expect(
            page.getByRole("button", { name: "Posts", exact: true }),
        ).toHaveCount(0);
    });

    test("states the wall, and offers nothing, when they blocked you", async ({
        authenticatedPage: page,
    }) => {
        await page.route("**/api/v1/**", async (route, request) => {
            const url = request.url();
            if (url.includes("/profiles/bob")) {
                await route.fulfill({
                    json: { data: { ...bob, isBlockedBy: true, postCount: 0 } },
                });
            } else {
                await route.fulfill({ json: { data: [] } });
            }
        });

        await page.goto("/profile/bob");

        await expect(page.getByText("@bob blocked you")).toBeVisible();
        // `exact` matters: without it "Follow" also matches the "10 Followers"
        // and "5 Following" count buttons, which are still on the page.
        await expect(
            page.getByRole("button", { name: "Follow", exact: true }),
        ).toHaveCount(0);
        await expect(
            page.getByRole("button", { name: "Message", exact: true }),
        ).toHaveCount(0);
    });
});

test.describe("Blocked accounts in Settings", () => {
    /*
     * This list is the only route back to a block — the account is invisible
     * in the feed, in search and on its own timeline — so it is the one screen
     * the feature cannot ship without.
     */
    test("lists a blocked account and lifts the block", async ({
        authenticatedPage: page,
    }) => {
        let lifted = false;
        const deletes: string[] = [];

        await page.route("**/api/v1/**", async (route, request) => {
            const url = request.url();
            const isBlocks = url.includes("/blocks");
            if (isBlocks && request.method() === "DELETE") {
                deletes.push(request.postData() ?? "");
                lifted = true;
                await route.fulfill({ json: { data: { isBlocked: false } } });
            } else if (isBlocks && request.method() === "GET") {
                await route.fulfill({
                    json: {
                        data: lifted
                            ? []
                            : [
                                  {
                                      userId: "user-2",
                                      username: "bob",
                                      fullName: "Bob Builder",
                                      avatarUrl: "",
                                      bio: null,
                                  },
                              ],
                        meta: { limit: 20, offset: 0, count: 1, total: 1 },
                    },
                });
            } else if (url.includes("/users/me")) {
                await route.fulfill({
                    json: {
                        data: {
                            id: "user-1",
                            username: "alice",
                            email: "alice@example.com",
                            isEmailVerified: true,
                            providers: ["local"],
                            createdAt: new Date().toISOString(),
                        },
                    },
                });
            } else {
                await route.fulfill({ json: { data: [] } });
            }
        });

        await page.goto("/settings");

        await expect(page.getByText("@bob")).toBeVisible();
        await page.getByRole("button", { name: "Unblock" }).click();

        await expect(
            page.getByText("You have not blocked anyone."),
        ).toBeVisible();
        expect(deletes).toEqual([JSON.stringify({ targetId: "user-2" })]);
    });
});
