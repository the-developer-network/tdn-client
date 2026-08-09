import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../../../tests/msw-server";

// RegisterView reaches apiClient and useAuthStore, both of which touch
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
import { RegisterView } from "./RegisterView";

const BASE = "http://localhost:8080/api/v1";

const loginResponse = {
    accessToken: "token-123",
    expiresAt: Date.now() + 3600_000,
    user: { id: "u1", username: "newbie", isEmailVerified: false },
};

/**
 * A validation problem document in the shape the API actually returns. The
 * offending field is named only by `instancePath` — the message never mentions
 * it, so matching on the message cannot tell the fields apart.
 */
function validationProblem(instancePath: string, message: string) {
    return {
        type: "about:blank",
        title: "Validation Error",
        status: 400,
        detail: "Invalid data format provided.",
        instance: "/api/v1/auth/register",
        validation: [
            {
                instancePath,
                schemaPath: `#/properties${instancePath}/minLength`,
                keyword: "minLength",
                params: { limit: 3 },
                message,
            },
        ],
    };
}

function profileHandler() {
    return http.get(`${BASE}/profiles/newbie`, () =>
        HttpResponse.json({
            data: { fullName: "New Bie", avatarUrl: "" },
        }),
    );
}

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByPlaceholderText("Email"), "new@example.com");
    await user.type(screen.getByPlaceholderText("Username"), "newbie");
    await user.type(screen.getByPlaceholderText("Password"), "hunter2hunter2");
}

function registerButton() {
    return screen.getByRole("button", { name: "Register" });
}

beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState(useAuthStore.getInitialState());
    useAuthModalStore.setState({
        isOpen: true,
        step: "register",
        identifier: "",
        recoveryToken: null,
    });
});

describe("RegisterView", () => {
    it("marks the field the API rejected, not the one the message reads like", async () => {
        const user = userEvent.setup();
        server.use(
            http.post(`${BASE}/auth/register`, () =>
                HttpResponse.json(
                    validationProblem(
                        "/username",
                        "must NOT have fewer than 3 characters",
                    ),
                    { status: 400 },
                ),
            ),
        );

        render(<RegisterView />);
        await fillForm(user);
        await user.click(registerButton());

        await screen.findByText("must NOT have fewer than 3 characters");
        expect(screen.getByPlaceholderText("Username")).toHaveClass(
            "border-red-500",
        );
        expect(screen.getByPlaceholderText("Email")).not.toHaveClass(
            "border-red-500",
        );
    });

    it("sends the user to the login step when the account was created but the auto-login failed", async () => {
        const user = userEvent.setup();
        server.use(
            http.post(`${BASE}/auth/register`, () =>
                HttpResponse.json({
                    data: {
                        id: "u1",
                        username: "newbie",
                        createdAt: new Date().toISOString(),
                    },
                }),
            ),
            http.post(`${BASE}/auth/login`, () =>
                HttpResponse.json(
                    {
                        type: "about:blank",
                        title: "Internal Server Error",
                        status: 500,
                        detail: "Something went wrong.",
                        instance: "/api/v1/auth/login",
                    },
                    { status: 500 },
                ),
            ),
        );

        render(<RegisterView />);
        await fillForm(user);
        await user.click(registerButton());

        // The account exists now, so resubmitting this form can only ever 409.
        await waitFor(() => {
            expect(useAuthModalStore.getState().step).toBe("login");
        });
        expect(useAuthModalStore.getState().identifier).toBe("newbie");
    });

    it("registers, signs in and moves on to email verification", async () => {
        const user = userEvent.setup();
        server.use(
            http.post(`${BASE}/auth/register`, () =>
                HttpResponse.json({
                    data: {
                        id: "u1",
                        username: "newbie",
                        createdAt: new Date().toISOString(),
                    },
                }),
            ),
            http.post(`${BASE}/auth/login`, () =>
                HttpResponse.json({ data: loginResponse }),
            ),
            profileHandler(),
        );

        render(<RegisterView />);
        await fillForm(user);
        await user.click(registerButton());

        await waitFor(() => {
            expect(useAuthModalStore.getState().step).toBe("verify-email");
        });
        expect(useAuthStore.getState().isAuthenticated).toBe(true);
        expect(localStorage.getItem("access_token")).toBe("token-123");
    });

    // Every other view in this modal submits on Enter. This one had no <form>
    // at all, so the keyboard path did nothing: the only way to register was to
    // reach for the mouse.
    it("registers when Enter is pressed in a field, not only on a click", async () => {
        const user = userEvent.setup();
        server.use(
            http.post(`${BASE}/auth/register`, () =>
                HttpResponse.json({
                    data: {
                        id: "u1",
                        username: "newbie",
                        createdAt: new Date().toISOString(),
                    },
                }),
            ),
            http.post(`${BASE}/auth/login`, () =>
                HttpResponse.json({ data: loginResponse }),
            ),
            profileHandler(),
        );

        render(<RegisterView />);
        await fillForm(user);
        // `fillForm` leaves the focus in the password field.
        await user.keyboard("{Enter}");

        await waitFor(() => {
            expect(useAuthModalStore.getState().step).toBe("verify-email");
        });
    });

    // `Button` sets no default `type`, so every button inside a <form> is a
    // submit button unless it says otherwise. Back must only go back.
    it("does not register when Back is pressed", async () => {
        const user = userEvent.setup();
        const paths: string[] = [];
        const record = ({ request }: { request: Request }) => {
            paths.push(new URL(request.url).pathname);
        };
        server.events.on("request:start", record);

        try {
            render(<RegisterView />);
            await fillForm(user);
            await user.click(screen.getByRole("button", { name: "Back" }));

            expect(useAuthModalStore.getState().step).toBe("identifier");
            expect(paths).not.toContain("/api/v1/auth/register");
        } finally {
            server.events.removeListener("request:start", record);
        }
    });

    // The payload trims, so a whitespace-only username is submitted as "" —
    // a request that can only come back as a validation error.
    it("keeps the submit button disabled for a whitespace-only username", async () => {
        const user = userEvent.setup();
        render(<RegisterView />);

        await user.type(
            screen.getByPlaceholderText("Email"),
            "new@example.com",
        );
        await user.type(screen.getByPlaceholderText("Username"), "   ");
        await user.type(
            screen.getByPlaceholderText("Password"),
            "hunter2hunter2",
        );

        expect(registerButton()).toBeDisabled();
    });
});
