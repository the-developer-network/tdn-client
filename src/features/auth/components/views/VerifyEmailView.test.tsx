import { StrictMode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../../../tests/msw-server";

// VerifyEmailView reaches apiClient and useAuthStore, both of which touch
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
import { VerifyEmailView } from "./VerifyEmailView";

const BASE = "http://localhost:8080/api/v1";

/** The API reports errors as RFC 7807 problem documents. */
function problem(detail: string, status: number) {
    return {
        type: "about:blank",
        title: "Bad Request",
        status,
        detail,
        instance: "/api/v1/auth/verify-email",
    };
}

/** The view sends a code the moment it mounts, so every test needs this. */
function mockSendVerification(response = HttpResponse.json({ data: null })) {
    server.use(
        http.post(`${BASE}/auth/send-verification`, () => response.clone()),
    );
}

function codeInput() {
    return screen.getByPlaceholderText("00000000");
}

function verifyButton() {
    return screen.getByRole("button", { name: "Verify Email" });
}

beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState(useAuthStore.getInitialState());
    useAuthStore.setState({
        isAuthenticated: true,
        user: { username: "alice", isEmailVerified: false } as never,
    });
    useAuthModalStore.setState({
        isOpen: true,
        step: "verify-email",
        identifier: "alice",
        recoveryToken: null,
    });
});

describe("VerifyEmailView", () => {
    it("says so when the code could not be sent", async () => {
        mockSendVerification(
            HttpResponse.json(problem("Too many requests.", 429), {
                status: 429,
            }),
        );

        render(<VerifyEmailView />);

        await screen.findByText("Too many requests.");
    });

    it("rejects a wrong code in the page, not in a dialog", async () => {
        const user = userEvent.setup();
        mockSendVerification();
        server.use(
            http.post(`${BASE}/auth/verify-email`, () =>
                HttpResponse.json(problem("Invalid verification code.", 400), {
                    status: 400,
                }),
            ),
        );

        render(<VerifyEmailView />);
        await user.type(codeInput(), "12345678");
        await user.click(verifyButton());

        await screen.findByText("Invalid verification code.");
        expect(useAuthModalStore.getState().isOpen).toBe(true);
        expect(useAuthStore.getState().user?.isEmailVerified).toBe(false);
    });

    it("reports a failed resend instead of rejecting into nowhere", async () => {
        const user = userEvent.setup();
        // The first send, on mount, succeeds; the resend is rate limited.
        let calls = 0;
        server.use(
            http.post(`${BASE}/auth/send-verification`, () => {
                calls += 1;
                if (calls === 1) return HttpResponse.json({ data: null });
                return HttpResponse.json(
                    problem("Verification code has expired.", 429),
                    { status: 429 },
                );
            }),
        );

        render(<VerifyEmailView />);
        await user.click(
            screen.getByRole("button", {
                name: "Didn't receive a code? Resend",
            }),
        );

        await screen.findByText("Verification code has expired.");
    });

    // The app mounts under StrictMode, which runs mount effects twice in
    // development — two codes emailed, two hits against a STRICT rate limit.
    it("asks for one code even when the effect runs twice", async () => {
        let calls = 0;
        server.use(
            http.post(`${BASE}/auth/send-verification`, () => {
                calls += 1;
                return HttpResponse.json({ data: null });
            }),
        );

        render(
            <StrictMode>
                <VerifyEmailView />
            </StrictMode>,
        );

        await waitFor(() => {
            expect(calls).toBeGreaterThan(0);
        });
        expect(calls).toBe(1);
    });

    it("verifies on Enter", async () => {
        const user = userEvent.setup();
        mockSendVerification();
        server.use(
            http.post(`${BASE}/auth/verify-email`, () =>
                HttpResponse.json({ data: { verified: true } }),
            ),
        );

        render(<VerifyEmailView />);
        await user.type(codeInput(), "12345678{Enter}");

        await waitFor(() => {
            expect(useAuthStore.getState().user?.isEmailVerified).toBe(true);
        });
        expect(useAuthModalStore.getState().isOpen).toBe(false);
    });

    it("marks the account verified and closes on a good code", async () => {
        const user = userEvent.setup();
        mockSendVerification();
        server.use(
            http.post(`${BASE}/auth/verify-email`, () =>
                HttpResponse.json({ data: { verified: true } }),
            ),
        );

        render(<VerifyEmailView />);
        await user.type(codeInput(), "12345678");
        await user.click(verifyButton());

        await waitFor(() => {
            expect(useAuthStore.getState().user?.isEmailVerified).toBe(true);
        });
        expect(useAuthModalStore.getState().isOpen).toBe(false);
    });
});
