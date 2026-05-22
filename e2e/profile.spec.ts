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
});
