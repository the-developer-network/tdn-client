import { act, renderHook } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../../tests/msw-server";

// useBlockAction → useAuthStore → Zustand persist captures localStorage at
// module-evaluation time. Stub it before any imports are resolved.
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

import { useAuthModalStore } from "../../auth/store/auth-modal.store";
import { useAuthStore } from "../../../core/auth/auth.store";
import { useToastStore } from "../../../shared/store/toast.store";
import { useBlockAction } from "./useBlockAction";

const BASE = "http://localhost:8080/api/v1";

const mockUser = { id: "user-1", username: "testuser", isEmailVerified: true };

function signIn() {
    useAuthStore.setState({
        user: mockUser,
        token: "tok",
        isAuthenticated: true,
    });
    localStorage.setItem("access_token", "tok");
}

beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
    useAuthModalStore.getState().reset();
    useToastStore.setState({ toasts: [] });
});

describe("useBlockAction", () => {
    it("opens the auth modal and sends nothing when unauthenticated", async () => {
        let requested = false;
        server.use(
            http.post(`${BASE}/blocks`, () => {
                requested = true;
                return HttpResponse.json({ data: { isBlocked: true } });
            }),
        );

        const { result } = renderHook(() => useBlockAction());

        let outcome: boolean | undefined;
        await act(async () => {
            outcome = await result.current.block("user-2");
        });

        expect(outcome).toBe(false);
        expect(requested).toBe(false);
        expect(useAuthModalStore.getState().isOpen).toBe(true);
    });

    it("reports success once the server has answered", async () => {
        signIn();
        server.use(
            http.post(`${BASE}/blocks`, () =>
                HttpResponse.json({ data: { isBlocked: true } }),
            ),
        );

        const { result } = renderHook(() => useBlockAction());

        let outcome: boolean | undefined;
        await act(async () => {
            outcome = await result.current.block("user-2");
        });

        expect(outcome).toBe(true);
        expect(useToastStore.getState().toasts).toHaveLength(0);
    });

    it("lifts a block through the unblock endpoint", async () => {
        signIn();
        let method: string | null = null;
        server.use(
            http.delete(`${BASE}/blocks`, ({ request }) => {
                method = request.method;
                return HttpResponse.json({ data: { isBlocked: false } });
            }),
        );

        const { result } = renderHook(() => useBlockAction());

        let outcome: boolean | undefined;
        await act(async () => {
            outcome = await result.current.unblock("user-2");
        });

        expect(outcome).toBe(true);
        expect(method).toBe("DELETE");
    });

    /*
     * The caller has nothing to roll back — a block has no optimistic surface
     * — so a failure that is not announced is a failure the reader believes
     * worked.
     */
    it("toasts the failure and reports it rather than rolling back silently", async () => {
        signIn();
        server.use(
            http.post(`${BASE}/blocks`, () =>
                HttpResponse.json(
                    {
                        status: 404,
                        title: "NotFoundError",
                        detail: "User not found.",
                    },
                    { status: 404 },
                ),
            ),
        );

        const { result } = renderHook(() => useBlockAction());

        let outcome: boolean | undefined;
        await act(async () => {
            outcome = await result.current.block("user-2");
        });

        expect(outcome).toBe(false);
        const toasts = useToastStore.getState().toasts;
        expect(toasts).toHaveLength(1);
        expect(toasts[0].type).toBe("error");
        expect(toasts[0].message).toBe("User not found.");
    });

    // An empty id is not dropped from the body the way `undefined` is: it
    // reaches the server, fails validation, and surfaces as a toast about a
    // request the user never made.
    it("refuses an empty target id without calling the API", async () => {
        signIn();
        let requested = false;
        server.use(
            http.post(`${BASE}/blocks`, () => {
                requested = true;
                return HttpResponse.json({ data: { isBlocked: true } });
            }),
        );
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        const { result } = renderHook(() => useBlockAction());

        let outcome: boolean | undefined;
        await act(async () => {
            outcome = await result.current.block("");
        });

        expect(outcome).toBe(false);
        expect(requested).toBe(false);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
    });

    it("names the account it is working on so one row cannot disable the rest", async () => {
        signIn();
        // The gate is built before the handler so releasing it cannot race
        // the request that is meant to be waiting on it.
        let release!: () => void;
        const gate = new Promise<void>((resolve) => {
            release = resolve;
        });
        server.use(
            http.post(`${BASE}/blocks`, async () => {
                await gate;
                return HttpResponse.json({ data: { isBlocked: true } });
            }),
        );

        const { result } = renderHook(() => useBlockAction());

        let pending: Promise<boolean> | undefined;
        act(() => {
            pending = result.current.block("user-2");
        });

        expect(result.current.pendingId).toBe("user-2");

        await act(async () => {
            release();
            await pending;
        });

        expect(result.current.pendingId).toBeNull();
    });
});
