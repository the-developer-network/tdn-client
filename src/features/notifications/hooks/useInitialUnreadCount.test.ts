import { act, renderHook } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../../tests/msw-server";

// apiClient calls localStorage.getItem at runtime; jsdom's Storage.clear() is
// broken in jsdom 29. Stub the entire localStorage before any module is loaded.
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
import { useNotificationStore } from "../store/notification.store";
import { useInitialUnreadCount } from "./useInitialUnreadCount";

const BASE = "http://localhost:8080/api/v1";

beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ isAuthenticated: false, token: null, user: null });
    useNotificationStore.setState({ notifications: [], unreadCount: 0 });
});

describe("useInitialUnreadCount", () => {
    it("fetches notifications and populates the store when authenticated", async () => {
        useAuthStore.setState({ isAuthenticated: true, token: "mock-token" });

        await act(async () => {
            renderHook(() => useInitialUnreadCount());
        });

        expect(useNotificationStore.getState().notifications).toHaveLength(1);
        expect(useNotificationStore.getState().unreadCount).toBe(1);
    });

    it("does not fetch when not authenticated", async () => {
        const fetchSpy = vi.fn(() => HttpResponse.json({ data: [], meta: {} }));
        server.use(http.get(`${BASE}/notifications`, fetchSpy));

        await act(async () => {
            renderHook(() => useInitialUnreadCount());
        });

        expect(fetchSpy).not.toHaveBeenCalled();
        expect(useNotificationStore.getState().notifications).toHaveLength(0);
        expect(useNotificationStore.getState().unreadCount).toBe(0);
    });

    it("resets the store when isAuthenticated changes to false (logout)", async () => {
        useNotificationStore.setState({
            notifications: [
                {
                    recipientId: "user-1",
                    issuerId: "user-2",
                    username: "otheruser",
                    type: "LIKE",
                    avatarUrl: "",
                    referenceId: "post-1",
                    createdAt: new Date().toISOString(),
                    isRead: false,
                },
            ],
            unreadCount: 1,
        });

        useAuthStore.setState({ isAuthenticated: false, token: null });

        await act(async () => {
            renderHook(() => useInitialUnreadCount());
        });

        expect(useNotificationStore.getState().notifications).toHaveLength(0);
        expect(useNotificationStore.getState().unreadCount).toBe(0);
    });

    it("silently ignores API errors without throwing", async () => {
        useAuthStore.setState({ isAuthenticated: true, token: "mock-token" });
        server.use(
            http.get(`${BASE}/notifications`, () => HttpResponse.error()),
        );

        await expect(
            act(async () => {
                renderHook(() => useInitialUnreadCount());
            }),
        ).resolves.not.toThrow();

        expect(useNotificationStore.getState().notifications).toHaveLength(0);
        expect(useNotificationStore.getState().unreadCount).toBe(0);
    });
});
