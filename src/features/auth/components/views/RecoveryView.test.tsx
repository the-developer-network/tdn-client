import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../../../tests/msw-server";

// RecoveryView reaches apiClient and the persisted auth store, both of which
// take hold of localStorage at module-evaluation time.
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

import { useAuthStore } from "../../../../core/auth/auth.store";
import { useAuthModalStore } from "../../store/auth-modal.store";
import { RecoveryView } from "./RecoveryView";

const BASE = "http://localhost:8080/api/v1";

/** The API reports errors as RFC 7807 problem documents. */
function problem(detail: string, status: number) {
    return {
        type: "about:blank",
        title: status === 401 ? "UnauthorizedError" : "Internal Server Error",
        status,
        detail,
        instance: "/api/v1/auth/recover-account",
    };
}

function recovered(isEmailVerified: boolean) {
    return HttpResponse.json({
        data: {
            accessToken: "recovered-token",
            expiresAt: 1_800,
            user: { id: "u1", username: "alice", isEmailVerified },
        },
    });
}

/**
 * `/auth/recover-account` is `isAnonymous`, so a 401 comes straight back to
 * the view. The refresh handler stays because flagging it `isPublic` again
 * would replay the request and reach for a session that does not exist —
 * without the handler that regression would surface as an unhandled request
 * rather than a failed assertion.
 */
function stubProfileAndRefresh() {
    server.use(
        http.get(`${BASE}/profiles/:username`, () =>
            HttpResponse.json({
                data: { username: "alice", fullName: "Alice", avatarUrl: null },
            }),
        ),
        http.post(
            `${BASE}/auth/refresh`,
            () => new HttpResponse(null, { status: 401 }),
        ),
    );
}

function recoverButton() {
    return screen.getByRole("button", { name: "Yes, recover my account" });
}

function renderView() {
    return render(
        <MemoryRouter>
            <RecoveryView />
        </MemoryRouter>,
    );
}

beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState(useAuthStore.getInitialState());
    // `closeModal` schedules a 300 ms timer that wipes the token and step.
    // Going through `openModal` cancels any timer a previous test left
    // pending, which `setState` alone cannot reach.
    useAuthModalStore.getState().openModal("account-recovery");
    useAuthModalStore.setState({
        identifier: "alice",
        recoveryToken: "recovery-token-1",
    });
    stubProfileAndRefresh();
});

describe("RecoveryView", () => {
    // The API separates an expired token from a malformed one from a
    // rate limit. The view answered all of them with the same guess.
    it("reports the reason the API gave instead of a fixed guess", async () => {
        const user = userEvent.setup();
        server.use(
            http.post(`${BASE}/auth/recover-account`, () =>
                HttpResponse.json(problem("Invalid token purpose.", 401), {
                    status: 401,
                }),
            ),
        );

        renderView();
        await user.click(recoverButton());

        await screen.findByText("Invalid token purpose.");
        expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    // The failure banner was never reset, so a successful retry left the
    // account recovered and the screen still saying it had failed.
    it("clears the previous failure when the retry succeeds", async () => {
        const user = userEvent.setup();
        let attempts = 0;
        server.use(
            http.post(`${BASE}/auth/recover-account`, () => {
                attempts += 1;
                return attempts === 1
                    ? HttpResponse.json(problem("Service unavailable.", 503), {
                          status: 503,
                      })
                    : recovered(true);
            }),
        );

        renderView();
        await user.click(recoverButton());
        await screen.findByText("Service unavailable.");

        await user.click(recoverButton());

        await waitFor(() => {
            expect(useAuthStore.getState().isAuthenticated).toBe(true);
        });
        expect(screen.queryByText("Service unavailable.")).toBeNull();
    });

    // Recovery re-authenticates exactly as login does, so it owes the user
    // the same verification prompt login gives them.
    it("sends a recovered account with an unverified email on to verification", async () => {
        const user = userEvent.setup();
        server.use(
            http.post(`${BASE}/auth/recover-account`, () => recovered(false)),
        );

        renderView();
        await user.click(recoverButton());

        await waitFor(() => {
            expect(useAuthModalStore.getState().step).toBe("verify-email");
        });
        expect(useAuthModalStore.getState().isOpen).toBe(true);
    });

    it("signs a verified account in and closes the modal", async () => {
        const user = userEvent.setup();
        server.use(
            http.post(`${BASE}/auth/recover-account`, () => recovered(true)),
        );

        renderView();
        await user.click(recoverButton());

        await waitFor(() => {
            expect(useAuthModalStore.getState().isOpen).toBe(false);
        });
        expect(localStorage.getItem("access_token")).toBe("recovered-token");
        expect(useAuthStore.getState().user?.fullName).toBe("Alice");
    });
});
