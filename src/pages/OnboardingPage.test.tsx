import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// `useAuthStore` and `useOnboardingStore` both persist, and Zustand captures
// storage at module-evaluation time; jsdom 29's Storage.clear() is broken.
vi.hoisted(() => {
    const _map = new Map<string, string>();
    vi.stubGlobal("localStorage", {
        getItem: (key: string) => _map.get(key) ?? null,
        setItem: (key: string, value: string) => {
            _map.set(key, String(value));
        },
        removeItem: (key: string) => {
            _map.delete(key);
        },
        clear: () => {
            _map.clear();
        },
        get length() {
            return _map.size;
        },
        key: (i: number) => [..._map.keys()][i] ?? null,
    });
});

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual =
        await vi.importActual<typeof import("react-router-dom")>(
            "react-router-dom",
        );
    return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../features/onboarding/hooks/useOnboardingSuggestions", () => ({
    useOnboardingSuggestions: vi.fn(),
}));
vi.mock("../features/onboarding/hooks/useOnboardingFollows", () => ({
    useOnboardingFollows: vi.fn(),
}));
vi.mock("../features/onboarding/hooks/useFollowingCount", () => ({
    useFollowingCount: vi.fn(),
}));

import { useOnboardingSuggestions } from "../features/onboarding/hooks/useOnboardingSuggestions";
import { useOnboardingFollows } from "../features/onboarding/hooks/useOnboardingFollows";
import { useFollowingCount } from "../features/onboarding/hooks/useFollowingCount";
import { useOnboardingStore } from "../features/onboarding/store/onboarding.store";
import { useAuthStore } from "../core/auth/auth.store";
import OnboardingPage from "./OnboardingPage";

const account = (id: string) => ({
    userId: id,
    username: id,
    fullName: `${id} name`,
    avatarUrl: "",
    contentCount: 1,
});

function mockSuggestions(
    overrides: Partial<ReturnType<typeof useOnboardingSuggestions>> = {},
) {
    vi.mocked(useOnboardingSuggestions).mockReturnValue({
        accounts: [],
        isLoading: false,
        error: null,
        retry: vi.fn(),
        ...overrides,
    });
}

function mockFollows(followed: string[] = []) {
    vi.mocked(useOnboardingFollows).mockReturnValue({
        followedIds: new Set(followed),
        followedCount: followed.length,
        isPending: () => false,
        toggle: vi.fn(),
    });
}

function renderPage() {
    return render(
        <MemoryRouter>
            <OnboardingPage />
        </MemoryRouter>,
    );
}

/** Walks step one: picks a field and presses Continue. */
async function goToAccounts() {
    await userEvent.click(screen.getByRole("button", { name: "Backend" }));
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
}

beforeEach(() => {
    mockNavigate.mockClear();
    localStorage.clear();
    useOnboardingStore.getState().reset();
    useAuthStore.setState({
        user: { id: "user-1", username: "alice", isEmailVerified: true },
        isAuthenticated: true,
    });
    mockSuggestions();
    mockFollows();
    vi.mocked(useFollowingCount).mockReturnValue({
        count: 0,
        isLoading: false,
    });
});

describe("OnboardingPage", () => {
    it("opens on the field picker", () => {
        renderPage();

        expect(screen.getByText("What do you build?")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Backend" })).toBeVisible();
    });

    it("will not continue until a field is picked", async () => {
        renderPage();

        expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();

        await userEvent.click(screen.getByRole("button", { name: "Backend" }));

        expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
    });

    it("passes the picked fields on to the suggestions hook", async () => {
        renderPage();
        await goToAccounts();

        expect(useOnboardingSuggestions).toHaveBeenCalledWith(["BACKEND"]);
    });

    it("holds the finish button shut below the required follows", async () => {
        mockSuggestions({
            accounts: ["a", "b", "c", "d", "e", "f"].map(account),
        });
        mockFollows(["a", "b"]);

        renderPage();
        await goToAccounts();

        expect(
            screen.getByRole("button", { name: "Go to my feed" }),
        ).toBeDisabled();
        expect(screen.getByText("2 of 5 followed")).toBeInTheDocument();
    });

    it("opens the finish button once five are followed", async () => {
        mockSuggestions({
            accounts: ["a", "b", "c", "d", "e", "f"].map(account),
        });
        mockFollows(["a", "b", "c", "d", "e"]);

        renderPage();
        await goToAccounts();

        expect(
            screen.getByRole("button", { name: "Go to my feed" }),
        ).toBeEnabled();
    });

    // A young deployment may not hold five accounts at all; demanding five
    // would make the flow impossible to finish.
    it("drops the requirement to the number of accounts on offer", async () => {
        mockSuggestions({ accounts: ["a", "b"].map(account) });
        mockFollows(["a", "b"]);

        renderPage();
        await goToAccounts();

        expect(screen.getByText("2 of 2 followed")).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Go to my feed" }),
        ).toBeEnabled();
    });

    // The single agreed escape hatch: nothing to follow means nothing to gate.
    it("lets the user out when the suggestions never arrived", async () => {
        mockSuggestions({ error: "Suggestions could not be loaded." });

        renderPage();
        await goToAccounts();

        expect(
            screen.getByRole("button", { name: "Go to my feed" }),
        ).toBeEnabled();
        expect(screen.getByRole("button", { name: "Try again" })).toBeVisible();
    });

    it("records completion and leaves for the feed on finish", async () => {
        mockSuggestions({ accounts: ["a", "b"].map(account) });
        mockFollows(["a", "b"]);

        renderPage();
        await goToAccounts();
        await userEvent.click(
            screen.getByRole("button", { name: "Go to my feed" }),
        );

        expect(useOnboardingStore.getState().isCompleted("user-1")).toBe(true);
        expect(useOnboardingStore.getState().interests).toEqual(["BACKEND"]);
        expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    });

    // The gate opens at five in total, so follows already on the books count.
    // Asking someone who follows three for five more is a different rule.
    it("credits the follows the account already had", async () => {
        vi.mocked(useFollowingCount).mockReturnValue({
            count: 3,
            isLoading: false,
        });
        mockSuggestions({
            accounts: ["a", "b", "c", "d", "e", "f"].map(account),
        });
        mockFollows(["a", "b"]);

        renderPage();
        await goToAccounts();

        expect(screen.getByText("2 of 2 followed")).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Go to my feed" }),
        ).toBeEnabled();
    });

    it("goes back to the field picker", async () => {
        renderPage();
        await goToAccounts();
        await userEvent.click(screen.getByRole("button", { name: "Back" }));

        expect(screen.getByText("What do you build?")).toBeInTheDocument();
    });
});
