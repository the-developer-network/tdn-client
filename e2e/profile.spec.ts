import { test, expect, mockUser } from "./fixtures";
import type { Profile } from "../src/features/profile/api/profile.types";

const mockProfile: Profile = {
    userId: "user-2",
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
};

test.describe("Profile page", () => {
    test("shows the user full name from the API", async ({
        authenticatedPage: page,
    }) => {
        await page.route("**/api/v1/**", async (route, request) => {
            const url = request.url();
            if (url.includes("/profiles/bob")) {
                await route.fulfill({ json: { data: mockProfile } });
            } else if (url.includes("/users/bob/posts")) {
                await route.fulfill({ json: { data: [] } });
            } else {
                await route.fulfill({ json: { data: null } });
            }
        });

        await page.goto("/profile/bob");

        await expect(
            page.getByRole("heading", { name: "Bob Builder", level: 1 }),
        ).toBeVisible();
    });

    test("shows Edit Profile button when the profile is the current user", async ({
        authenticatedPage: page,
    }) => {
        const ownProfile: Profile = {
            ...mockProfile,
            userId: mockUser.id,
            username: mockUser.username,
            fullName: mockUser.fullName,
            isMe: true,
        };

        await page.route("**/api/v1/**", async (route, request) => {
            const url = request.url();
            if (url.includes(`/profiles/${mockUser.username}`)) {
                await route.fulfill({ json: { data: ownProfile } });
            } else if (url.includes(`/users/${mockUser.username}/posts`)) {
                await route.fulfill({ json: { data: [] } });
            } else {
                await route.fulfill({ json: { data: null } });
            }
        });

        await page.goto(`/profile/${mockUser.username}`);

        await expect(
            page.getByRole("button", { name: "Edit Profile" }),
        ).toBeVisible();
    });

    /**
     * The follow control in the follower/following list sits inside a row that
     * navigates to the profile, so anything the thumb misses opens the profile
     * instead — the exact symptom this size exists to prevent. 44px is the
     * documented minimum touch target; the pill was 26px when it shipped.
     */
    test("follow button in the following list is a 44px touch target on mobile", async ({
        authenticatedPage: page,
    }) => {
        const ownProfile: Profile = {
            ...mockProfile,
            userId: mockUser.id,
            username: mockUser.username,
            fullName: mockUser.fullName,
            isMe: true,
        };

        await page.setViewportSize({ width: 390, height: 844 });
        await page.route("**/api/v1/**", async (route, request) => {
            const url = request.url();
            if (url.includes(`/profiles/${mockUser.username}/following`)) {
                await route.fulfill({
                    json: {
                        data: [
                            {
                                userId: "user-2",
                                username: "bob",
                                fullName: "Bob Builder",
                                avatarUrl: "",
                                bio: "",
                                isFollowing: true,
                                isMe: false,
                            },
                        ],
                    },
                });
            } else if (url.includes(`/profiles/${mockUser.username}`)) {
                await route.fulfill({ json: { data: ownProfile } });
            } else if (url.includes(`/users/${mockUser.username}/posts`)) {
                await route.fulfill({ json: { data: [] } });
            } else {
                await route.fulfill({ json: { data: null } });
            }
        });

        await page.goto(`/profile/${mockUser.username}`);
        await page
            .getByRole("button", { name: /Following$/ })
            .first()
            .click();

        const followButton = page.getByRole("button", {
            name: "Following",
            exact: true,
        });
        const box = await followButton.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.height).toBeGreaterThanOrEqual(44);

        // And it still unfollows rather than opening the profile.
        await followButton.click();
        await expect(
            page.getByRole("button", { name: "Follow", exact: true }),
        ).toBeVisible();
        expect(page.url()).toContain(`/profile/${mockUser.username}`);
    });
});
