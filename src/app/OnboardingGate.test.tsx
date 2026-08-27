import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// Both `useAuthStore` and `useOnboardingStore` persist, and Zustand captures
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

vi.mock("../features/profile/api/profile.api", () => ({
    profileApi: { getProfile: vi.fn() },
}));

import { profileApi } from "../features/profile/api/profile.api";
import { useAuthStore } from "../core/auth/auth.store";
import { useAuthModalStore } from "../features/auth/store/auth-modal.store";
import { useOnboardingStore } from "../features/onboarding/store/onboarding.store";
import { OnboardingGate } from "./OnboardingGate";

const profile = (followingCount: number) =>
    ({ followingCount }) as Awaited<ReturnType<typeof profileApi.getProfile>>;

function renderGate() {
    return render(
        <MemoryRouter initialEntries={["/"]}>
            <Routes>
                <Route element={<OnboardingGate />}>
                    <Route path="/" element={<div>feed</div>} />
                </Route>
                <Route path="/onboarding" element={<div>onboarding</div>} />
            </Routes>
        </MemoryRouter>,
    );
}

function signIn() {
    useAuthStore.setState({
        user: { id: "user-1", username: "alice", isEmailVerified: true },
        isAuthenticated: true,
    });
}

beforeEach(() => {
    vi.mocked(profileApi.getProfile).mockReset();
    useAuthStore.setState(useAuthStore.getInitialState());
    useAuthModalStore.setState({ isOpen: false });
    useOnboardingStore.getState().reset();
});

describe("OnboardingGate", () => {
    it("lets a signed-out visitor straight through", () => {
        renderGate();

        expect(screen.getByText("feed")).toBeInTheDocument();
        expect(profileApi.getProfile).not.toHaveBeenCalled();
    });

    // RegisterView calls setAuth and then leaves the modal on verify-email.
    // Redirecting there unmounts AuthModal along with the page holding it.
    it("stands down while the auth modal is open", () => {
        signIn();
        useAuthModalStore.setState({ isOpen: true });

        renderGate();

        expect(screen.getByText("feed")).toBeInTheDocument();
        expect(profileApi.getProfile).not.toHaveBeenCalled();
    });

    it("asks nothing once the user has finished onboarding", () => {
        signIn();
        useOnboardingStore.getState().complete("user-1", ["BACKEND"]);

        renderGate();

        expect(screen.getByText("feed")).toBeInTheDocument();
        expect(profileApi.getProfile).not.toHaveBeenCalled();
    });

    it("sends an account that follows nobody to /onboarding", async () => {
        signIn();
        vi.mocked(profileApi.getProfile).mockResolvedValue(profile(0));

        renderGate();

        expect(await screen.findByText("onboarding")).toBeInTheDocument();
    });

    // The requirement is five, not one: an account that got partway and
    // wandered off still has to finish.
    it("sends an account short of the requirement to /onboarding", async () => {
        signIn();
        vi.mocked(profileApi.getProfile).mockResolvedValue(profile(3));

        renderGate();

        expect(await screen.findByText("onboarding")).toBeInTheDocument();
        expect(useOnboardingStore.getState().isCompleted("user-1")).toBe(false);
    });

    it("passes an account that already meets the requirement and remembers it", async () => {
        signIn();
        vi.mocked(profileApi.getProfile).mockResolvedValue(profile(5));

        renderGate();

        expect(await screen.findByText("feed")).toBeInTheDocument();
        expect(useOnboardingStore.getState().isCompleted("user-1")).toBe(true);
    });

    // Finishing once settles it. Without this the account would be pulled back
    // in the moment it unfollowed someone, which is nagging, not onboarding.
    it("never asks again once the flow has been completed", async () => {
        signIn();
        useOnboardingStore.getState().complete("user-1", ["BACKEND"]);
        vi.mocked(profileApi.getProfile).mockResolvedValue(profile(1));

        renderGate();

        expect(screen.getByText("feed")).toBeInTheDocument();
        expect(profileApi.getProfile).not.toHaveBeenCalled();
    });

    // The gate is a nudge. A failed request must never lock an account out of
    // the app it is already signed into.
    it("passes when the profile request fails", async () => {
        signIn();
        vi.mocked(profileApi.getProfile).mockRejectedValue(
            new Error("offline"),
        );

        renderGate();

        expect(await screen.findByText("feed")).toBeInTheDocument();
    });

    it("shows a spinner while the check is in flight", async () => {
        signIn();
        vi.mocked(profileApi.getProfile).mockReturnValue(
            new Promise(() => {}) as ReturnType<typeof profileApi.getProfile>,
        );

        const { container } = renderGate();

        await waitFor(() =>
            expect(
                container.querySelector(".animate-spin"),
            ).toBeInTheDocument(),
        );
        expect(screen.queryByText("feed")).not.toBeInTheDocument();
    });
});
