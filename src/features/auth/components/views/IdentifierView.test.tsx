import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../../../tests/msw-server";

// IdentifierView reaches apiClient, which reads localStorage at runtime.
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
vi.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }));

import { useAuthModalStore } from "../../store/auth-modal.store";
import { IdentifierView } from "./IdentifierView";

const BASE = "http://localhost:8080/api/v1";

/**
 * Mirrors the API: `/auth/check` looks the identifier up with an exact match
 * (`OR: [{ email }, { username }]`), so anything the client has not tidied up
 * simply does not resolve.
 */
function mockCheck(registered: string[]) {
    const seen: string[] = [];

    server.use(
        http.post(`${BASE}/auth/check`, async ({ request }) => {
            const body = (await request.json()) as { identifier: string };
            seen.push(body.identifier);
            return HttpResponse.json({
                data: { check: registered.includes(body.identifier) },
            });
        }),
    );

    return seen;
}

function identifierInput() {
    return screen.getByPlaceholderText("Phone, email, or username");
}

function nextButton() {
    return screen.getByRole("button", { name: "Next" });
}

beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
    useAuthModalStore.setState({
        isOpen: true,
        step: "initial",
        identifier: "",
        recoveryToken: null,
    });
});

describe("IdentifierView", () => {
    it("looks up a padded identifier as the account it names", async () => {
        const user = userEvent.setup();
        const seen = mockCheck(["alice"]);
        render(<IdentifierView />);

        // A phone keyboard adds the trailing space; the account still exists.
        await user.type(identifierInput(), "  alice ");
        await user.click(nextButton());

        await waitFor(() => {
            expect(useAuthModalStore.getState().step).toBe("login");
        });
        expect(seen).toEqual(["alice"]);
        expect(useAuthModalStore.getState().identifier).toBe("alice");
    });

    it("advances on Enter", async () => {
        const user = userEvent.setup();
        mockCheck(["alice"]);
        render(<IdentifierView />);

        await user.type(identifierInput(), "alice{Enter}");

        await waitFor(() => {
            expect(useAuthModalStore.getState().step).toBe("login");
        });
    });

    it("reports a failed lookup instead of doing nothing", async () => {
        const user = userEvent.setup();
        server.use(
            http.post(`${BASE}/auth/check`, () =>
                HttpResponse.json(
                    {
                        type: "about:blank",
                        title: "Internal Server Error",
                        status: 500,
                        detail: "Something went wrong.",
                        instance: "/api/v1/auth/check",
                    },
                    { status: 500 },
                ),
            ),
        );

        render(<IdentifierView />);
        await user.type(identifierInput(), "alice");
        await user.click(nextButton());

        await screen.findByText("Something went wrong.");
        expect(useAuthModalStore.getState().step).toBe("initial");
    });

    it("routes an unknown identifier to registration", async () => {
        const user = userEvent.setup();
        mockCheck(["alice"]);
        render(<IdentifierView />);

        await user.type(identifierInput(), "newcomer");
        await user.click(nextButton());

        await waitFor(() => {
            expect(useAuthModalStore.getState().step).toBe("register");
        });
    });

    it("starts OAuth against the API this build talks to", async () => {
        const user = userEvent.setup();
        const location = { href: "" };
        vi.stubGlobal("location", location as unknown as Location);

        render(<IdentifierView />);
        await user.click(
            screen.getByRole("button", { name: /Sign up with Google/i }),
        );

        expect(location.href).toBe(`${BASE}/oauth/google`);
        vi.unstubAllGlobals();
    });
});
