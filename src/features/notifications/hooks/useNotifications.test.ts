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

import { useNotificationStore } from "../store/notification.store";
import { useNotifications } from "./useNotifications";

const BASE = "http://localhost:8080/api/v1";

const mockNotification = {
    recipientId: "user-1",
    issuerId: "user-2",
    username: "otheruser",
    type: "LIKE" as const,
    avatarUrl: "https://example.com/avatar2.png",
    referenceId: "post-1",
    createdAt: new Date().toISOString(),
    isRead: false,
};

beforeEach(() => {
    localStorage.clear();
    useNotificationStore.setState({ notifications: [], unreadCount: 0 });
});

describe("useNotifications", () => {
    it("fetch() loads notifications into the store and clears isLoading", async () => {
        const { result } = renderHook(() => useNotifications());

        await act(async () => {
            await result.current.fetch();
        });

        expect(result.current.isLoading).toBe(false);
        expect(useNotificationStore.getState().notifications).toHaveLength(1);
        expect(useNotificationStore.getState().unreadCount).toBe(1);
    });

    it("fetch() sets an error message when the API fails", async () => {
        server.use(
            http.get(`${BASE}/notifications`, () => HttpResponse.error()),
        );

        const { result } = renderHook(() => useNotifications());

        await act(async () => {
            await result.current.fetch();
        });

        expect(result.current.error).toBeTruthy();
        expect(useNotificationStore.getState().notifications).toHaveLength(0);
    });

    it("hasMore is false when the server returns fewer than 20 notifications", async () => {
        // Default handler returns 1 notification (< PAGE_LIMIT of 20)
        const { result } = renderHook(() => useNotifications());

        await act(async () => {
            await result.current.fetch();
        });

        expect(result.current.hasMore).toBe(false);
    });

    it("loadMore() leaves the store unchanged when hasMore is false", async () => {
        const { result } = renderHook(() => useNotifications());
        await act(async () => {
            await result.current.fetch();
        });
        expect(result.current.hasMore).toBe(false);

        const countBefore =
            useNotificationStore.getState().notifications.length;

        await act(async () => {
            await result.current.loadMore();
        });

        // No additional request should have been made
        expect(useNotificationStore.getState().notifications).toHaveLength(
            countBefore,
        );
        expect(result.current.isLoadingMore).toBe(false);
    });

    // `setPage(nextPage)` ran before the request, so a failed page 2 still
    // advanced the counter. The next attempt asked for page 3 and page 2 was
    // skipped for good — those notifications become unreachable.
    it("does not advance the page when loading more fails", async () => {
        const page1 = Array.from({ length: 20 }, (_, i) => ({
            ...mockNotification,
            issuerId: `user-${i + 2}`,
        }));
        const requested: number[] = [];
        let failNext = true;

        server.use(
            http.get(`${BASE}/notifications`, ({ request }) => {
                const page = Number(
                    new URL(request.url).searchParams.get("page") ?? "1",
                );
                requested.push(page);
                if (page === 1) return HttpResponse.json({ data: page1 });
                if (failNext) {
                    failNext = false;
                    return HttpResponse.error();
                }
                return HttpResponse.json({ data: [mockNotification] });
            }),
        );

        const { result } = renderHook(() => useNotifications());
        await act(async () => {
            await result.current.fetch();
        });

        await act(async () => {
            await result.current.loadMore();
        });
        await act(async () => {
            await result.current.loadMore();
        });

        expect(requested).toEqual([1, 2, 2]);
        expect(useNotificationStore.getState().notifications).toHaveLength(21);
    });

    // A page that never arrived must not take the ones already on screen
    // with it.
    it("keeps the loaded notifications when loading more fails", async () => {
        const page1 = Array.from({ length: 20 }, (_, i) => ({
            ...mockNotification,
            issuerId: `user-${i + 2}`,
        }));

        server.use(
            http.get(`${BASE}/notifications`, ({ request }) => {
                const page = Number(
                    new URL(request.url).searchParams.get("page") ?? "1",
                );
                if (page === 1) return HttpResponse.json({ data: page1 });
                return HttpResponse.error();
            }),
        );

        const { result } = renderHook(() => useNotifications());
        await act(async () => {
            await result.current.fetch();
        });
        await act(async () => {
            await result.current.loadMore();
        });

        expect(useNotificationStore.getState().notifications).toHaveLength(20);
        expect(result.current.isLoadingMore).toBe(false);
        expect(result.current.hasMore).toBe(true);
    });

    it("loadMore() fetches page 2 and appends results when hasMore is true", async () => {
        // Return exactly 20 notifications on page 1 → hasMore = true
        const page1 = Array.from({ length: 20 }, (_, i) => ({
            ...mockNotification,
            issuerId: `user-${i + 2}`,
        }));

        server.use(
            http.get(`${BASE}/notifications`, ({ request }) => {
                const url = new URL(request.url);
                const page = Number(url.searchParams.get("page") ?? "1");
                if (page === 1) return HttpResponse.json({ data: page1 });
                return HttpResponse.json({ data: [mockNotification] });
            }),
        );

        const { result } = renderHook(() => useNotifications());

        await act(async () => {
            await result.current.fetch();
        });
        expect(result.current.hasMore).toBe(true);
        expect(useNotificationStore.getState().notifications).toHaveLength(20);

        await act(async () => {
            await result.current.loadMore();
        });

        expect(useNotificationStore.getState().notifications).toHaveLength(21);
        expect(result.current.hasMore).toBe(false);
    });
});
