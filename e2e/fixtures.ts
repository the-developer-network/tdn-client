import { test as base, type Page } from "@playwright/test";

export const mockUser = {
    id: "user-1",
    username: "alice",
    fullName: "Alice Smith",
    avatarUrl: "",
    isEmailVerified: true,
};

async function injectAuth(page: Page) {
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
            // Without this every authenticated spec lands on /onboarding:
            // `OnboardingGate` sends an account that follows nobody there, and
            // the mocked profile reports followingCount 0. Specs that mean to
            // exercise the flow inject auth without this key instead.
            localStorage.setItem(
                "tdn-onboarding",
                JSON.stringify({
                    state: { completedUserIds: [user.id], interests: [] },
                    version: 0,
                }),
            );
        },
        { user: mockUser },
    );
}

export const test = base.extend<{ authenticatedPage: Page }>({
    authenticatedPage: async ({ page }, use) => {
        await injectAuth(page);
        await use(page);
    },
});

export { expect } from "@playwright/test";
