import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../../tests/msw-server";

// useDeleteAccount reaches apiClient and useAuthStore, both of which touch
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

const navigate = vi.fn();
vi.mock("react-router-dom", () => ({
    useNavigate: () => navigate,
}));

import { useAuthStore } from "../../../core/auth/auth.store";
import { useDeleteAccount } from "./useDeleteAccount";

const BASE = "http://localhost:8080/api/v1";

/** The API reports errors as RFC 7807 problem documents. */
function problem(detail: string, status = 400) {
    return {
        type: "about:blank",
        title: "Bad Request",
        status,
        detail,
        instance: "/api/v1/users/me",
    };
}

/**
 * Mirrors the backend contract: `DELETE /users/me` validates its body against
 * `SoftDeleteUserSchema` ({ password: string }) and rejects the request before
 * it reaches the use case when the password is missing.
 */
function mockDeleteAccount() {
    const captured: { body: Record<string, unknown> | null } = { body: null };

    server.use(
        http.delete(`${BASE}/users/me`, async ({ request }) => {
            const raw = await request.text();
            captured.body = raw
                ? (JSON.parse(raw) as Record<string, unknown>)
                : null;

            if (typeof captured.body?.password !== "string") {
                return HttpResponse.json(
                    problem("body must have required property 'password'"),
                    {
                        status: 400,
                    },
                );
            }

            return new HttpResponse(null, { status: 204 });
        }),
        http.post(`${BASE}/auth/logout`, () =>
            HttpResponse.json({ data: null }),
        ),
    );

    return captured;
}

beforeEach(() => {
    localStorage.clear();
    navigate.mockClear();
    useAuthStore.setState(useAuthStore.getInitialState());
});

describe("useDeleteAccount", () => {
    it("sends the confirmation password the backend requires", async () => {
        const captured = mockDeleteAccount();
        const { result } = renderHook(() => useDeleteAccount());

        await act(async () => {
            await result.current.handleDelete("hunter2");
        });

        expect(captured.body).toEqual({ password: "hunter2" });
    });

    it("logs the user out and leaves the page on success", async () => {
        mockDeleteAccount();
        useAuthStore.setState({ isAuthenticated: true });
        const { result } = renderHook(() => useDeleteAccount());

        await act(async () => {
            await result.current.handleDelete("hunter2");
        });

        await waitFor(() => {
            expect(useAuthStore.getState().isAuthenticated).toBe(false);
        });
        expect(navigate).toHaveBeenCalledWith("/");
        expect(result.current.error).toBeNull();
    });

    it("surfaces the error and keeps the session when the password is wrong", async () => {
        server.use(
            http.delete(`${BASE}/users/me`, () =>
                HttpResponse.json(problem("Invalid password."), {
                    status: 400,
                }),
            ),
        );
        useAuthStore.setState({ isAuthenticated: true });
        const { result } = renderHook(() => useDeleteAccount());

        await act(async () => {
            await result.current.handleDelete("wrong-password");
        });

        expect(result.current.error).toBe("Invalid password.");
        expect(result.current.isLoading).toBe(false);
        expect(useAuthStore.getState().isAuthenticated).toBe(true);
        expect(navigate).not.toHaveBeenCalled();
    });
});
