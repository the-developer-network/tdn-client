import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Zustand `persist` captures storage at module-evaluation time, and the API
// client reads `access_token` at runtime — stub before any import runs.
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

import { useAuthStore } from "../../../core/auth/auth.store";
import { useNotificationSocket } from "./useNotificationSocket";

const sockets: FakeWebSocket[] = [];

class FakeWebSocket {
    static readonly OPEN = 1;
    url: string;
    readyState = FakeWebSocket.OPEN;
    sent: string[] = [];
    onopen: (() => void) | null = null;
    onclose: (() => void) | null = null;
    onerror: (() => void) | null = null;
    onmessage: ((event: MessageEvent) => void) | null = null;

    constructor(url: string) {
        this.url = url;
        sockets.push(this);
    }

    send(data: string) {
        this.sent.push(data);
    }

    close() {
        this.readyState = 3;
    }
}

beforeEach(() => {
    sockets.length = 0;
    localStorage.clear();
    useAuthStore.setState({
        user: null,
        token: null,
        isAuthenticated: false,
    });
    // Note: no `vi.unstubAllGlobals()` teardown — it would also drop the
    // hoisted `localStorage` stub that every later test depends on.
    vi.stubGlobal("WebSocket", FakeWebSocket);
});

describe("useNotificationSocket", () => {
    it("connects and authenticates with the stored access token", async () => {
        localStorage.setItem("access_token", "jwt-123");
        useAuthStore.setState({ isAuthenticated: true, token: "jwt-123" });

        renderHook(() => useNotificationSocket());

        await waitFor(() => expect(sockets).toHaveLength(1));
        sockets[0].onopen?.();

        expect(JSON.parse(sockets[0].sent[0])).toEqual({
            event: "auth",
            token: "jwt-123",
        });
    });

    // Regression: `token` is not persisted (auth.store partialises to
    // { user, isAuthenticated }), so after a reload the store rehydrates
    // authenticated with a null token while the JWT is still in localStorage.
    // Gating on the store field meant the socket silently never opened.
    it("connects after a reload, when only localStorage holds the token", async () => {
        localStorage.setItem("access_token", "jwt-from-storage");
        useAuthStore.setState({ isAuthenticated: true, token: null });

        renderHook(() => useNotificationSocket());

        await waitFor(() => expect(sockets).toHaveLength(1));
        sockets[0].onopen?.();

        expect(JSON.parse(sockets[0].sent[0])).toEqual({
            event: "auth",
            token: "jwt-from-storage",
        });
    });

    it("does not connect when unauthenticated", () => {
        renderHook(() => useNotificationSocket());

        expect(sockets).toHaveLength(0);
    });

    it("does not connect when authenticated but no token exists anywhere", () => {
        useAuthStore.setState({ isAuthenticated: true, token: null });

        renderHook(() => useNotificationSocket());

        expect(sockets).toHaveLength(0);
    });
});
