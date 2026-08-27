import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../../tests/msw-server";

// `useAuthStore` and `apiClient` both read `localStorage` at module-evaluation
// time, so the stub has to exist before the imports below run.
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

const navigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual =
        await vi.importActual<typeof import("react-router-dom")>(
            "react-router-dom",
        );
    return { ...actual, useNavigate: () => navigate };
});

import { FollowListModal } from "./FollowListModal";
import { useAuthStore } from "../../../core/auth/auth.store";
import { useAuthModalStore } from "../../auth/store/auth-modal.store";
import type { FollowUser } from "../api/profile.types";

const BASE = "http://localhost:8080/api/v1";

const bob: FollowUser = {
    userId: "user-2",
    username: "bob",
    fullName: "Bob Smith",
    avatarUrl: "",
    bio: "Backend developer",
    isFollowing: true,
    isMe: false,
};

function serveFollowing(users: FollowUser[]) {
    server.use(
        http.get(`${BASE}/profiles/:username/following`, () =>
            HttpResponse.json({ data: users }),
        ),
    );
}

function renderModal(
    props: Partial<React.ComponentProps<typeof FollowListModal>> = {},
) {
    const onClose = vi.fn();
    const onFollowChange = vi.fn();
    render(
        <MemoryRouter>
            <FollowListModal
                isOpen
                onClose={onClose}
                username="alice"
                type="following"
                onFollowChange={onFollowChange}
                {...props}
            />
        </MemoryRouter>,
    );
    return { onClose, onFollowChange };
}

/** The follow/unfollow control, not the row it sits in. */
const followButton = () => screen.getByRole("button", { name: /^Follow/ });

describe("FollowListModal", () => {
    beforeEach(() => {
        navigate.mockClear();
        useAuthStore.setState({
            ...useAuthStore.getInitialState(),
            isAuthenticated: true,
        });
        useAuthModalStore.setState(useAuthModalStore.getInitialState());
    });

    it("unfollows from the list and leaves the row in place", async () => {
        serveFollowing([bob]);
        let unfollowed: unknown = null;
        server.use(
            http.delete(`${BASE}/follows`, async ({ request }) => {
                unfollowed = await request.json();
                return new HttpResponse(null, { status: 204 });
            }),
        );

        const { onFollowChange } = renderModal();
        await screen.findByText("Bob Smith");

        await userEvent.click(followButton());

        expect(
            screen.getByRole("button", { name: "Follow" }),
        ).toBeInTheDocument();
        // The row stays, so the unfollow can be undone without a refetch.
        expect(screen.getByText("Bob Smith")).toBeInTheDocument();
        await waitFor(() => expect(unfollowed).toEqual({ targetId: "user-2" }));
        expect(onFollowChange).toHaveBeenCalledWith(-1);
    });

    it("does not navigate or close when the follow button is clicked", async () => {
        serveFollowing([bob]);
        const { onClose } = renderModal();
        await screen.findByText("Bob Smith");

        await userEvent.click(followButton());

        expect(navigate).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
    });

    it("still opens the profile when the row itself is clicked", async () => {
        serveFollowing([bob]);
        const { onClose } = renderModal();

        await userEvent.click(await screen.findByText("Bob Smith"));

        expect(onClose).toHaveBeenCalled();
        expect(navigate).toHaveBeenCalledWith("/profile/bob");
    });

    it("rolls the button back when the request fails", async () => {
        serveFollowing([bob]);
        server.use(http.delete(`${BASE}/follows`, () => HttpResponse.error()));

        const { onFollowChange } = renderModal();
        await screen.findByText("Bob Smith");

        await userEvent.click(followButton());

        await waitFor(() =>
            expect(
                screen.getByRole("button", { name: "Following" }),
            ).toBeInTheDocument(),
        );
        // Reported both ways, so a counter fed from here ends where it started.
        expect(onFollowChange.mock.calls).toEqual([[-1], [1]]);
    });

    it("closes itself and opens the auth modal for a signed-out visitor", async () => {
        serveFollowing([bob]);
        useAuthStore.setState({
            ...useAuthStore.getInitialState(),
            isAuthenticated: false,
        });

        const { onClose } = renderModal();
        await screen.findByText("Bob Smith");

        await userEvent.click(followButton());

        expect(onClose).toHaveBeenCalled();
        expect(useAuthModalStore.getState().isOpen).toBe(true);
        expect(
            screen.getByRole("button", { name: "Following" }),
        ).toBeInTheDocument();
    });

    it("renders no follow button on your own row", async () => {
        serveFollowing([{ ...bob, isMe: true, isFollowing: false }]);
        renderModal();
        await screen.findByText("Bob Smith");

        expect(
            screen.queryByRole("button", { name: /^Follow/ }),
        ).not.toBeInTheDocument();
    });
});
