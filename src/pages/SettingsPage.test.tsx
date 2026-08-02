import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../tests/msw-server";

// SettingsPage reaches apiClient and useAuthStore, both of which touch
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

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }));
vi.mock("../shared/layout/PageShell", () => ({
    PageShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("../shared/components/TrendingTopicsWidget", () => ({
    TrendingTopicsWidget: () => null,
}));

import { useAuthStore } from "../core/auth/auth.store";
import SettingsPage from "./SettingsPage";

const BASE = "http://localhost:8080/api/v1";

const accountInfo = {
    id: "u1",
    username: "alice",
    email: "alice@example.com",
    isEmailVerified: true,
    providers: ["local"],
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
};

/** The API reports errors as RFC 7807 problem documents. */
function problem(detail: string, status = 400) {
    return {
        type: "about:blank",
        title: "Bad Request",
        status,
        detail,
        instance: "/api/v1/users/me/username",
    };
}

/** Fails the first username update, accepts every one after it. */
function failFirstUsernameUpdate() {
    let calls = 0;

    server.use(
        http.get(`${BASE}/users/me`, () =>
            HttpResponse.json({ data: accountInfo }),
        ),
        http.patch(`${BASE}/users/me/username`, () => {
            calls += 1;
            if (calls === 1) {
                return HttpResponse.json(
                    problem("That username is already taken."),
                    { status: 409 },
                );
            }
            return new HttpResponse(null, { status: 204 });
        }),
    );
}

function usernameInput() {
    return screen.getByPlaceholderText("New username");
}

beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
    useAuthStore.setState(useAuthStore.getInitialState());
    useAuthStore.setState({
        isAuthenticated: true,
        user: { username: "alice" } as never,
    });
});

describe("SettingsPage — change username", () => {
    it("keeps what was typed when the update fails", async () => {
        const user = userEvent.setup();
        failFirstUsernameUpdate();
        render(<SettingsPage />);

        await user.type(usernameInput(), "taken");
        await user.click(
            screen.getByRole("button", { name: "Update Username" }),
        );

        await screen.findByText("That username is already taken.");
        // Nothing was changed server-side, so the value must survive for a
        // retry instead of forcing the user to type it again.
        expect(usernameInput()).toHaveValue("taken");
    });

    it("clears the field on a success that follows a failure", async () => {
        const user = userEvent.setup();
        failFirstUsernameUpdate();
        render(<SettingsPage />);

        await user.type(usernameInput(), "taken");
        await user.click(
            screen.getByRole("button", { name: "Update Username" }),
        );
        await screen.findByText("That username is already taken.");

        await user.clear(usernameInput());
        await user.type(usernameInput(), "available");
        await user.click(
            screen.getByRole("button", { name: "Update Username" }),
        );

        await screen.findByText("Username updated successfully.");
        await waitFor(() => {
            expect(usernameInput()).toHaveValue("");
        });
    });
});
