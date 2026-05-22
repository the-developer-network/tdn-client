import { test, expect } from "@playwright/test";

test.describe("Auth modal flow", () => {
    test("clicking Sign In opens the identifier input", async ({ page }) => {
        await page.route("**/api/v1/**", (route) => route.abort());

        await page.goto("/");

        await page.getByRole("button", { name: "Sign In" }).click();

        await expect(
            page.getByPlaceholder("Phone, email, or username"),
        ).toBeVisible();
    });

    test("identifier check returns true → shows login step", async ({
        page,
    }) => {
        await page.route("**/api/v1/**", async (route, request) => {
            if (
                request.url().includes("/auth/check") &&
                request.method() === "POST"
            ) {
                await route.fulfill({
                    json: { data: { check: true } },
                });
            } else {
                await route.abort();
            }
        });

        await page.goto("/");
        await page.getByRole("button", { name: "Sign In" }).click();

        const input = page.getByPlaceholder("Phone, email, or username");
        await input.fill("alice@example.com");
        await page.getByRole("button", { name: "Next" }).click();

        await expect(page.getByText("Enter your password")).toBeVisible();
    });

    test("identifier check returns false → shows register step", async ({
        page,
    }) => {
        await page.route("**/api/v1/**", async (route, request) => {
            if (
                request.url().includes("/auth/check") &&
                request.method() === "POST"
            ) {
                await route.fulfill({
                    json: { data: { check: false } },
                });
            } else {
                await route.abort();
            }
        });

        await page.goto("/");
        await page.getByRole("button", { name: "Sign In" }).click();

        const input = page.getByPlaceholder("Phone, email, or username");
        await input.fill("newuser@example.com");
        await page.getByRole("button", { name: "Next" }).click();

        await expect(page.getByText("Create your account")).toBeVisible();
    });
});
