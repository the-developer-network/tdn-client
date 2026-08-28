import { test, expect, mockUser } from "./fixtures";

/**
 * Signs in without the `tdn-onboarding` key the shared fixture writes, so the
 * gate actually runs. Every other spec keeps that key precisely to stay out of
 * this flow.
 */
async function signInWithoutOnboarding(page: import("@playwright/test").Page) {
    await page.addInitScript(
        ({ user }: { user: typeof mockUser }) => {
            localStorage.setItem(
                "tdn-auth-storage",
                JSON.stringify({
                    state: { user, isAuthenticated: true },
                    version: 0,
                }),
            );
            localStorage.setItem("access_token", "mock-token");
        },
        { user: mockUser },
    );
}

function bot(id: string, isFollowing = false) {
    return {
        userId: id,
        username: id,
        fullName: `${id} name`,
        avatarUrl: "",
        bannerUrl: "",
        bio: "Tech Developer News",
        categories: ["BACKEND"],
        followersCount: 42,
        isFollowing,
    };
}

const BOTS = ["a1", "a2", "a3", "a4", "a5", "a6"].map((id) => bot(id));

/**
 * @param followingCount what `GET /profiles/:username` reports — 0 is the
 *   account that has to be sent through onboarding.
 * @param bots what `GET /profiles/bots` returns for the picked fields.
 */
async function mockApi(
    page: import("@playwright/test").Page,
    followingCount: number,
    bots = BOTS,
) {
    await page.route("**/api/v1/**", async (route, request) => {
        const url = request.url();

        // Before the generic `/profiles/` arm: that one matches this URL too,
        // and would answer the bot list with a profile.
        if (url.includes("/profiles/bots")) {
            await route.fulfill({ json: { data: bots } });
        } else if (url.includes("/profiles/suggestions")) {
            await route.fulfill({ json: { data: [] } });
        } else if (url.includes("/profiles/")) {
            await route.fulfill({
                json: { data: { ...mockUser, followingCount } },
            });
        } else if (url.includes("/follows")) {
            await route.fulfill({ status: 204, body: "" });
        } else {
            await route.fulfill({ json: { data: null } });
        }
    });
}

test.describe("Onboarding", () => {
    test("sends a new account through the flow and out to the feed", async ({
        page,
    }) => {
        await signInWithoutOnboarding(page);
        await mockApi(page, 0);

        await page.goto("/");
        await expect(page).toHaveURL(/\/onboarding$/);

        // Step one: no field picked, no way forward.
        const cont = page.getByRole("button", { name: "Continue" });
        await expect(cont).toBeDisabled();
        await page.getByRole("button", { name: "Backend" }).click();
        await cont.click();

        // Step two: the finish button waits for five follows.
        const finish = page.getByRole("button", { name: "Go to my feed" });
        await expect(finish).toBeDisabled();

        // `exact` matters: without it "Following" also matches "Follow", and
        // the loop would keep clicking the button it just toggled.
        const followButtons = page.getByRole("button", {
            name: "Follow",
            exact: true,
        });
        for (let i = 0; i < 5; i++) {
            await followButtons.first().click();
        }

        await expect(page.getByText("5 of 5 followed")).toBeVisible();
        await expect(finish).toBeEnabled();
        await finish.click();

        await expect(page).toHaveURL(/\/$/);
    });

    test("still gates an account that is short of the requirement", async ({
        page,
    }) => {
        await signInWithoutOnboarding(page);
        await mockApi(page, 4);

        await page.goto("/");

        await expect(page).toHaveURL(/\/onboarding$/);

        await page.getByRole("button", { name: "Backend" }).click();
        await page.getByRole("button", { name: "Continue" }).click();

        // Four already on the books, so only one more is asked for.
        await expect(page.getByText("Follow one more account")).toBeVisible();
        await expect(page.getByText("0 of 1 followed")).toBeVisible();
    });

    // A returning user's bots come back marked, and the profile's
    // followingCount already counts them. Counting the marked cards as
    // progress too would open the finish button having followed nobody.
    test("marks the bots the account already follows without crediting them twice", async ({
        page,
    }) => {
        await signInWithoutOnboarding(page);
        await mockApi(page, 3, [
            bot("a1", true),
            bot("a2", true),
            bot("a3", true),
            bot("a4"),
            bot("a5"),
            bot("a6"),
        ]);

        await page.goto("/");
        await expect(page).toHaveURL(/\/onboarding$/);

        await page.getByRole("button", { name: "Backend" }).click();
        await page.getByRole("button", { name: "Continue" }).click();

        await expect(
            page.getByRole("button", { name: "Following", exact: true }),
        ).toHaveCount(3);
        await expect(page.getByText("0 of 2 followed")).toBeVisible();

        const finish = page.getByRole("button", { name: "Go to my feed" });
        await expect(finish).toBeDisabled();

        const followButtons = page.getByRole("button", {
            name: "Follow",
            exact: true,
        });
        await followButtons.first().click();
        await followButtons.first().click();

        await expect(page.getByText("2 of 2 followed")).toBeVisible();
        await expect(finish).toBeEnabled();
    });

    test("leaves an account that already meets the requirement alone", async ({
        page,
    }) => {
        await signInWithoutOnboarding(page);
        await mockApi(page, 5);

        await page.goto("/");

        await expect(page).not.toHaveURL(/\/onboarding$/);
    });
});

test.describe("Onboarding after a real registration", () => {
    test("a freshly registered account lands in the flow", async ({ page }) => {
        await page.route("**/api/v1/**", async (route, request) => {
            const url = request.url();

            if (url.includes("/auth/check")) {
                await route.fulfill({ json: { data: { check: false } } });
            } else if (url.includes("/auth/register")) {
                await route.fulfill({
                    json: {
                        data: {
                            id: "user-1",
                            username: "alice",
                            createdAt: new Date().toISOString(),
                        },
                    },
                });
            } else if (url.includes("/auth/login")) {
                await route.fulfill({
                    json: {
                        data: {
                            accessToken: "mock-token",
                            expiresAt: Date.now() + 3_600_000,
                            user: {
                                id: "user-1",
                                username: "alice",
                                isEmailVerified: false,
                            },
                        },
                    },
                });
            } else if (url.includes("/auth/")) {
                await route.fulfill({ json: { data: {} } });
            } else if (url.includes("/profiles/bots")) {
                await route.fulfill({ json: { data: BOTS } });
            } else if (url.includes("/profiles/suggestions")) {
                await route.fulfill({ json: { data: [] } });
            } else if (url.includes("/profiles/")) {
                await route.fulfill({
                    json: { data: { ...mockUser, followingCount: 0 } },
                });
            } else {
                await route.fulfill({ json: { data: null } });
            }
        });

        await page.goto("/");
        await page.getByRole("button", { name: "Sign In" }).click();
        await page
            .getByPlaceholder("Phone, email, or username")
            .fill("alice@example.com");
        await page.getByRole("button", { name: "Next" }).click();

        await expect(page.getByText("Create your account")).toBeVisible();
        await page.getByPlaceholder("Email").fill("alice@example.com");
        await page.getByPlaceholder("Username").fill("alice");
        await page.getByPlaceholder("Password").fill("hunter2hunter2");
        await page.getByRole("button", { name: "Register" }).click();

        // A brand-new account is never verified, so the modal parks here.
        await page.getByRole("button", { name: "Skip for now" }).click();

        await expect(page).toHaveURL(/\/onboarding$/);
        await expect(page.getByText("What do you build?")).toBeVisible();
    });
});
