import { act, renderHook, waitFor } from "@testing-library/react";
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
import type { Notification } from "../api/notification.types";

const BASE = "http://localhost:8080/api/v1";

const makeNotification = (
    overrides: Partial<Notification> = {},
): Notification => ({
    recipientId: "user-1",
    issuerId: "user-2",
    username: "otheruser",
    type: "LIKE",
    avatarUrl: "https://example.com/avatar.png",
    referenceId: "post-1",
    createdAt: new Date().toISOString(),
    isRead: false,
    ...overrides,
});

/** Serves both endpoints the hook calls, independently. */
function serve({ list, count }: { list?: Notification[]; count?: number }) {
    if (list !== undefined) {
        server.use(
            http.get(`${BASE}/notifications`, () =>
                HttpResponse.json({ data: list }),
            ),
        );
    }
    if (count !== undefined) {
        server.use(
            http.get(`${BASE}/notifications/unread-count`, () =>
                HttpResponse.json({ data: { count } }),
            ),
        );
    }
}

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

        await waitFor(() =>
            expect(useNotificationStore.getState().notifications).toHaveLength(
                1,
            ),
        );
        expect(useNotificationStore.getState().unreadCount).toBe(1);
    });

    // The defect this endpoint exists to fix. The badge was counted off the
    // first page, so a page size of 20 was also the badge's ceiling: an
    // account with 35 unread notifications saw 20.
    it("shows the server's count even when it exceeds the page size", async () => {
        useAuthStore.setState({ isAuthenticated: true, token: "mock-token" });
        serve({
            list: Array.from({ length: 20 }, (_, i) =>
                makeNotification({ referenceId: `post-${i}` }),
            ),
            count: 35,
        });

        await act(async () => {
            renderHook(() => useInitialUnreadCount());
        });

        await waitFor(() =>
            expect(useNotificationStore.getState().unreadCount).toBe(35),
        );
        expect(useNotificationStore.getState().notifications).toHaveLength(20);
    });

    // The other direction: a first page that happens to be all-read must not
    // drag the badge down to zero when the server says otherwise.
    it("does not let an all-read first page contradict the count", async () => {
        useAuthStore.setState({ isAuthenticated: true, token: "mock-token" });
        serve({
            list: [makeNotification({ isRead: true })],
            count: 7,
        });

        await act(async () => {
            renderHook(() => useInitialUnreadCount());
        });

        await waitFor(() =>
            expect(useNotificationStore.getState().unreadCount).toBe(7),
        );
    });

    it("asks for the count and the list in the same pass", async () => {
        useAuthStore.setState({ isAuthenticated: true, token: "mock-token" });

        const seen: string[] = [];
        server.use(
            http.get(`${BASE}/notifications`, () => {
                seen.push("list");
                return HttpResponse.json({ data: [] });
            }),
            http.get(`${BASE}/notifications/unread-count`, () => {
                seen.push("count");
                return HttpResponse.json({ data: { count: 3 } });
            }),
        );

        await act(async () => {
            renderHook(() => useInitialUnreadCount());
        });

        await waitFor(() => expect(seen).toHaveLength(2));
        expect(seen).toContain("list");
        expect(seen).toContain("count");
    });

    it("does not fetch when not authenticated", async () => {
        const listSpy = vi.fn(() => HttpResponse.json({ data: [] }));
        const countSpy = vi.fn(() => HttpResponse.json({ data: { count: 0 } }));
        server.use(
            http.get(`${BASE}/notifications`, listSpy),
            http.get(`${BASE}/notifications/unread-count`, countSpy),
        );

        await act(async () => {
            renderHook(() => useInitialUnreadCount());
        });

        expect(listSpy).not.toHaveBeenCalled();
        expect(countSpy).not.toHaveBeenCalled();
        expect(useNotificationStore.getState().notifications).toHaveLength(0);
        expect(useNotificationStore.getState().unreadCount).toBe(0);
    });

    // The list no longer defines the count, so clearing it no longer clears
    // the badge — without an explicit reset the previous account's number
    // would survive the sign-out.
    it("resets the store when isAuthenticated changes to false (logout)", async () => {
        useNotificationStore.setState({
            notifications: [makeNotification()],
            unreadCount: 35,
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
            http.get(`${BASE}/notifications/unread-count`, () =>
                HttpResponse.error(),
            ),
        );

        await expect(
            act(async () => {
                renderHook(() => useInitialUnreadCount());
            }),
        ).resolves.not.toThrow();

        expect(useNotificationStore.getState().notifications).toHaveLength(0);
        expect(useNotificationStore.getState().unreadCount).toBe(0);
    });

    // The two requests settle independently: neither failure may take the
    // other's result down with it.
    it("keeps the list when only the count request fails", async () => {
        useAuthStore.setState({ isAuthenticated: true, token: "mock-token" });
        serve({ list: [makeNotification()] });
        server.use(
            http.get(`${BASE}/notifications/unread-count`, () =>
                HttpResponse.error(),
            ),
        );

        await act(async () => {
            renderHook(() => useInitialUnreadCount());
        });

        await waitFor(() =>
            expect(useNotificationStore.getState().notifications).toHaveLength(
                1,
            ),
        );
    });

    it("keeps the count when only the list request fails", async () => {
        useAuthStore.setState({ isAuthenticated: true, token: "mock-token" });
        serve({ count: 12 });
        server.use(
            http.get(`${BASE}/notifications`, () => HttpResponse.error()),
        );

        await act(async () => {
            renderHook(() => useInitialUnreadCount());
        });

        await waitFor(() =>
            expect(useNotificationStore.getState().unreadCount).toBe(12),
        );
    });
});
