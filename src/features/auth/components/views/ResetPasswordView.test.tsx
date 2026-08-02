import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../../../tests/msw-server";

// ResetPasswordView reaches apiClient, which reads localStorage at runtime.
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
import { useToastStore } from "../../../../shared/store/toast.store";
import { ResetPasswordView } from "./ResetPasswordView";

const BASE = "http://localhost:8080/api/v1";

/** The API reports errors as RFC 7807 problem documents. */
function problem(detail: string, status: number) {
    return {
        type: "about:blank",
        title: "BadRequestError",
        status,
        detail,
        instance: "/api/v1/auth/reset-password",
    };
}

interface ResetBody {
    email: string;
    otp: string;
    newPassword: string;
}

/**
 * Records every reset attempt that reaches the network and answers 204, the
 * way the real endpoint does on success.
 */
function captureResets() {
    const bodies: ResetBody[] = [];
    server.use(
        http.post(`${BASE}/auth/reset-password`, async ({ request }) => {
            bodies.push((await request.json()) as ResetBody);
            return new HttpResponse(null, { status: 204 });
        }),
    );
    return bodies;
}

function otpInput() {
    return screen.getByPlaceholderText("Enter OTP Code");
}

function passwordInput() {
    return screen.getByPlaceholderText("New Password");
}

function submitButton() {
    return screen.getByRole("button", { name: "Update Password" });
}

beforeEach(() => {
    localStorage.clear();
    useToastStore.setState({ toasts: [] });
    useAuthModalStore.setState({
        isOpen: true,
        step: "reset-password",
        identifier: "alice@example.com",
        recoveryToken: null,
    });
});

describe("ResetPasswordView", () => {
    // The API rejects anything other than exactly 8 characters, and a
    // short code used to make the button do nothing at all — no request,
    // no message, no spinner.
    it("says the code is the wrong length instead of doing nothing", async () => {
        const user = userEvent.setup();
        const requests = captureResets();

        render(<ResetPasswordView />);
        await user.type(otpInput(), "123");
        await user.type(passwordInput(), "newpassword123");
        await user.click(submitButton());

        await screen.findByText(
            "Enter the 8-character code sent to your email.",
        );
        expect(requests).toHaveLength(0);
    });

    // A seven-character code passed the old guard and was spent on a request
    // the schema rejects out of hand.
    it("does not spend a request on a seven-character code", async () => {
        const user = userEvent.setup();
        const requests = captureResets();

        render(<ResetPasswordView />);
        await user.type(otpInput(), "1234567");
        await user.type(passwordInput(), "newpassword123");
        await user.click(submitButton());

        await screen.findByText(
            "Enter the 8-character code sent to your email.",
        );
        expect(requests).toHaveLength(0);
    });

    // The API requires eight characters. Failing that check on the server
    // returns a validation error the old view reported as a bad code.
    it("flags a password below the minimum length before sending it", async () => {
        const user = userEvent.setup();
        const requests = captureResets();

        render(<ResetPasswordView />);
        await user.type(otpInput(), "12345678");
        await user.type(passwordInput(), "short");
        await user.click(submitButton());

        await screen.findByText("Password must be at least 8 characters.");
        expect(requests).toHaveLength(0);
    });

    it("reports why the reset failed instead of blaming the code", async () => {
        const user = userEvent.setup();
        server.use(
            http.post(`${BASE}/auth/reset-password`, () =>
                HttpResponse.json(
                    problem(
                        "This account uses an external provider (like Google or GitHub). Please log in using that provider.",
                        400,
                    ),
                    { status: 400 },
                ),
            ),
        );

        render(<ResetPasswordView />);
        await user.type(otpInput(), "12345678");
        await user.type(passwordInput(), "newpassword123");
        await user.click(submitButton());

        await screen.findByText(
            "This account uses an external provider (like Google or GitHub). Please log in using that provider.",
        );
        expect(useAuthModalStore.getState().step).toBe("reset-password");
    });

    it("submits on Enter", async () => {
        const user = userEvent.setup();
        captureResets();

        render(<ResetPasswordView />);
        await user.type(otpInput(), "12345678");
        await user.type(passwordInput(), "newpassword123{Enter}");

        await waitFor(() => {
            expect(useAuthModalStore.getState().step).toBe("login");
        });
    });

    // Codes are copied out of an email, and a copy commonly carries
    // surrounding whitespace that the eight-character schema rejects.
    it("sends a pasted code without its surrounding whitespace", async () => {
        const user = userEvent.setup();
        const requests = captureResets();

        render(<ResetPasswordView />);
        await user.type(otpInput(), " 12345678 ");
        await user.type(passwordInput(), "newpassword123");
        await user.click(submitButton());

        await waitFor(() => expect(requests).toHaveLength(1));
        expect(requests[0]).toEqual({
            email: "alice@example.com",
            otp: "12345678",
            newPassword: "newpassword123",
        });
    });

    it("confirms success in the app, not in a blocking dialog", async () => {
        const user = userEvent.setup();
        captureResets();

        render(<ResetPasswordView />);
        await user.type(otpInput(), "12345678");
        await user.type(passwordInput(), "newpassword123");
        await user.click(submitButton());

        await waitFor(() => {
            expect(useAuthModalStore.getState().step).toBe("login");
        });
        expect(useToastStore.getState().toasts).toEqual([
            expect.objectContaining({
                type: "success",
                message: "Your password has been reset successfully.",
            }),
        ]);
    });
});
