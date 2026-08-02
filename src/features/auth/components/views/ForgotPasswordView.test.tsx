import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../../../tests/msw-server";

// ForgotPasswordView reaches apiClient, which reads localStorage at runtime.
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
import { ForgotPasswordView } from "./ForgotPasswordView";

const BASE = "http://localhost:8080/api/v1";

/** The API reports errors as RFC 7807 problem documents. */
function problem(detail: string, status: number) {
    return {
        type: "about:blank",
        title: status === 429 ? "Too Many Requests" : "Internal Server Error",
        status,
        detail,
        instance: "/api/v1/auth/forgot-password",
    };
}

function emailInput() {
    return screen.getByPlaceholderText("example@mail.com");
}

function sendButton() {
    return screen.getByRole("button", { name: "Send Code" });
}

beforeEach(() => {
    localStorage.clear();
    useAuthModalStore.setState({
        isOpen: true,
        step: "forgot-password",
        identifier: "alice",
        recoveryToken: null,
    });
});

describe("ForgotPasswordView", () => {
    it("reports why the request failed instead of blaming the address", async () => {
        const user = userEvent.setup();
        server.use(
            http.post(`${BASE}/auth/forgot-password`, () =>
                HttpResponse.json(
                    problem("Rate limit exceeded, retry in 60 seconds.", 429),
                    { status: 429 },
                ),
            ),
        );

        render(<ForgotPasswordView />);
        await user.type(emailInput(), "alice@example.com");
        await user.click(sendButton());

        await screen.findByText("Rate limit exceeded, retry in 60 seconds.");
        expect(useAuthModalStore.getState().step).toBe("forgot-password");
    });

    it("flags a malformed address in the page, not in a dialog", async () => {
        const user = userEvent.setup();
        let requests = 0;
        server.use(
            http.post(`${BASE}/auth/forgot-password`, () => {
                requests += 1;
                return new HttpResponse(null, { status: 204 });
            }),
        );

        render(<ForgotPasswordView />);
        await user.type(emailInput(), "not-an-address");
        await user.click(sendButton());

        await screen.findByText("Please enter a valid email.");
        expect(requests).toBe(0);
    });

    it("sends on Enter", async () => {
        const user = userEvent.setup();
        server.use(
            http.post(`${BASE}/auth/forgot-password`, () =>
                HttpResponse.json({ data: null }),
            ),
        );

        render(<ForgotPasswordView />);
        await user.type(emailInput(), "alice@example.com{Enter}");

        await waitFor(() => {
            expect(useAuthModalStore.getState().step).toBe("reset-password");
        });
    });

    // The API answers 204 whether or not the account exists, so advancing is
    // correct — it must not leak whether the address is registered.
    it("moves to the reset step and remembers the address", async () => {
        const user = userEvent.setup();
        server.use(
            http.post(`${BASE}/auth/forgot-password`, () =>
                HttpResponse.json({ data: null }),
            ),
        );

        render(<ForgotPasswordView />);
        await user.type(emailInput(), "alice@example.com");
        await user.click(sendButton());

        await waitFor(() => {
            expect(useAuthModalStore.getState().step).toBe("reset-password");
        });
        expect(useAuthModalStore.getState().identifier).toBe(
            "alice@example.com",
        );
    });
});
