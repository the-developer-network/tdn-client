import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../tests/msw-server";

// Zustand's persist middleware captures the localStorage reference at store
// creation time (module load). vi.hoisted runs before any imports, so the
// mock is in place when auth.store.ts is first evaluated.
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

import { useAuthStore } from "./auth.store";

const BASE = "http://localhost:8080/api/v1";

const mockPayload = {
    id: "user-1",
    username: "testuser",
    isEmailVerified: true,
};

beforeEach(() => {
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
    localStorage.clear();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("useAuthStore", () => {
    describe("setAuth", () => {
        it("sets isAuthenticated to true and stores token in localStorage", () => {
            useAuthStore.getState().setAuth(mockPayload, "my-token");

            const state = useAuthStore.getState();
            expect(state.isAuthenticated).toBe(true);
            expect(state.token).toBe("my-token");
            expect(state.user).toEqual(mockPayload);
            expect(localStorage.getItem("access_token")).toBe("my-token");
        });
    });

    describe("updateUser", () => {
        it("merges partial user while preserving other fields", () => {
            useAuthStore.setState({
                user: {
                    ...mockPayload,
                    fullName: "Test User",
                    avatarUrl: "old.png",
                },
                token: "tok",
                isAuthenticated: true,
            });

            useAuthStore.getState().updateUser({ avatarUrl: "new.png" });

            const { user } = useAuthStore.getState();
            expect(user?.avatarUrl).toBe("new.png");
            expect(user?.fullName).toBe("Test User");
            expect(user?.username).toBe("testuser");
        });
    });

    describe("clearAuth", () => {
        it("resets state and removes access_token from localStorage", () => {
            localStorage.setItem("access_token", "tok");
            useAuthStore.setState({
                user: mockPayload,
                token: "tok",
                isAuthenticated: true,
            });

            useAuthStore.getState().clearAuth();

            const state = useAuthStore.getState();
            expect(state.isAuthenticated).toBe(false);
            expect(state.user).toBeNull();
            expect(state.token).toBeNull();
            expect(localStorage.getItem("access_token")).toBeNull();
        });
    });

    describe("logout", () => {
        it("calls the logout API and clears state on success", async () => {
            useAuthStore.setState({
                user: mockPayload,
                token: "tok",
                isAuthenticated: true,
            });

            await useAuthStore.getState().logout();

            const state = useAuthStore.getState();
            expect(state.isAuthenticated).toBe(false);
            expect(state.user).toBeNull();
            expect(state.token).toBeNull();
        });

        it("clears state even when the API call throws", async () => {
            server.use(
                http.post(`${BASE}/auth/logout`, () => HttpResponse.error()),
            );
            useAuthStore.setState({
                user: mockPayload,
                token: "tok",
                isAuthenticated: true,
            });

            await useAuthStore.getState().logout();

            const state = useAuthStore.getState();
            expect(state.isAuthenticated).toBe(false);
            expect(state.user).toBeNull();
            expect(state.token).toBeNull();
        });
    });
});
