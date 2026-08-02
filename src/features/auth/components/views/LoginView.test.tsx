import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../../../tests/msw-server";

// LoginView reaches apiClient and useAuthStore, both of which touch
// localStorage at module-evaluation time.
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

import { useAuthModalStore } from "../../store/auth-modal.store";
import { useAuthStore } from "../../../../core/auth/auth.store";
import { LoginView } from "./LoginView";

const BASE = "http://localhost:8080/api/v1";

const loginResponse = {
    accessToken: "token-123",
    expiresAt: Date.now() + 3600_000,
    user: { id: "u1", username: "alice", isEmailVerified: false },
};

function mockLogin() {
    server.use(
        http.post(`${BASE}/auth/login`, () =>
            HttpResponse.json({ data: loginResponse }),
        ),
        http.get(`${BASE}/profiles/alice`, () =>
            HttpResponse.json({
                data: { fullName: "Alice", avatarUrl: "" },
            }),
        ),
    );
}

function passwordInput() {
    return screen.getByPlaceholderText("Password");
}

function setIdentifier(identifier: string) {
    useAuthModalStore.setState({
        isOpen: true,
        step: "login",
        identifier,
        recoveryToken: null,
    });
}

beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState(useAuthStore.getInitialState());
    setIdentifier("alice");
});

describe("LoginView", () => {
    it("shows an email identifier as typed, without a handle prefix", () => {
        setIdentifier("alice@example.com");
        render(<LoginView />);

        expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    });

    it("still shows a username identifier as a handle", () => {
        render(<LoginView />);

        expect(screen.getByText("@alice")).toBeInTheDocument();
    });

    it("submits when Enter is pressed in the password field", async () => {
        const user = userEvent.setup();
        mockLogin();
        render(<LoginView />);

        await user.type(passwordInput(), "hunter2{Enter}");

        await waitFor(() => {
            expect(useAuthStore.getState().isAuthenticated).toBe(true);
        });
        expect(localStorage.getItem("access_token")).toBe("token-123");
    });

    // `Button` sets no default type, so a button inside the form submits it
    // unless it opts out.
    it("does not log in when the change-account button is pressed", async () => {
        const user = userEvent.setup();
        mockLogin();
        render(<LoginView />);

        await user.type(passwordInput(), "hunter2");
        await user.click(
            screen.getByRole("button", { name: "Change account" }),
        );

        expect(useAuthModalStore.getState().step).toBe("identifier");
        expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it("signs in and moves on to email verification", async () => {
        const user = userEvent.setup();
        mockLogin();
        render(<LoginView />);

        await user.type(passwordInput(), "hunter2");
        await user.click(screen.getByRole("button", { name: "Log in" }));

        await waitFor(() => {
            expect(useAuthModalStore.getState().step).toBe("verify-email");
        });
    });

    // The API spreads AccountPendingDeletionError into the problem document,
    // so `recoveryToken` sits at the top level next to `status`.
    it("diverts to account recovery when the account is pending deletion", async () => {
        const user = userEvent.setup();
        server.use(
            http.post(`${BASE}/auth/login`, () =>
                HttpResponse.json(
                    {
                        type: "about:blank",
                        title: "AccountPendingDeletionError",
                        status: 403,
                        detail: "Your account is scheduled for deletion. Do you want to recover it?",
                        instance: "/api/v1/auth/login",
                        recoveryToken: "recovery-abc",
                    },
                    { status: 403 },
                ),
            ),
        );

        render(<LoginView />);
        await user.type(passwordInput(), "hunter2");
        await user.click(screen.getByRole("button", { name: "Log in" }));

        await waitFor(() => {
            expect(useAuthModalStore.getState().step).toBe("account-recovery");
        });
        expect(useAuthModalStore.getState().recoveryToken).toBe("recovery-abc");
    });

    it("surfaces a rejected password and keeps the user on the step", async () => {
        const user = userEvent.setup();
        server.use(
            http.post(`${BASE}/auth/login`, () =>
                HttpResponse.json(
                    {
                        type: "about:blank",
                        title: "InvalidCredentialsError",
                        status: 401,
                        detail: "Invalid credentials.",
                        instance: "/api/v1/auth/login",
                    },
                    { status: 401 },
                ),
            ),
        );

        render(<LoginView />);
        await user.type(passwordInput(), "wrong-password");
        await user.click(screen.getByRole("button", { name: "Log in" }));

        await screen.findByText("Invalid credentials.");
        expect(useAuthModalStore.getState().step).toBe("login");
        expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
});
