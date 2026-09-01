import { renderHook, waitFor, act } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../../tests/msw-server";

// `feedApi` reaches `apiClient`, which reads the token from localStorage as it
// evaluates.
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

import { usePendingMedia } from "./usePendingMedia";
import type { Post } from "../api/feed.types";

const BASE = "http://localhost:8080/api/v1";

const resolved: Post = {
    id: "post-1",
    content: "with a video",
    type: "COMMUNITY",
    mediaUrls: ["https://cdn.example.com/clip.mp4"],
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0,
    quoteCount: 0,
    isLiked: false,
    isBookmarked: false,
    quotedPost: null,
    isSensitive: false,
    mediaPending: false,
    author: {
        id: "user-1",
        username: "alice",
        avatarUrl: "",
    },
};

/** Counts reads of the single post, so "only this post" can be asserted. */
function countReads() {
    const reads: string[] = [];
    server.use(
        http.get(`${BASE}/posts/:id`, ({ params }) => {
            reads.push(String(params.id));
            return HttpResponse.json({ data: resolved });
        }),
    );
    return reads;
}

beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe("usePendingMedia", () => {
    it("reads the one post and hands it back on a manual refresh", async () => {
        const reads = countReads();
        const onUpdated = vi.fn();
        const { result } = renderHook(() =>
            usePendingMedia({
                postId: "post-1",
                mediaPending: true,
                onUpdated,
            }),
        );

        await act(async () => {
            await result.current.refresh();
        });

        expect(reads).toEqual(["post-1"]);
        expect(onUpdated).toHaveBeenCalledWith(resolved);
    });

    it("asks again while the video is pending", async () => {
        const reads = countReads();
        renderHook(() =>
            usePendingMedia({
                postId: "post-1",
                mediaPending: true,
                onUpdated: vi.fn(),
            }),
        );

        expect(reads).toHaveLength(0);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(20_000);
        });
        await waitFor(() => expect(reads).toHaveLength(1));

        await act(async () => {
            await vi.advanceTimersByTimeAsync(20_000);
        });
        await waitFor(() => expect(reads).toHaveLength(2));
    });

    /*
     * The whole reason this hook exists rather than a refetch of the feed.
     * The list is cached for 60 s server-side, so polling it would cost every
     * other row and usually return the same stale copy of this one.
     */
    it("never polls once the video has resolved", async () => {
        const reads = countReads();
        renderHook(() =>
            usePendingMedia({
                postId: "post-1",
                mediaPending: false,
                onUpdated: vi.fn(),
            }),
        );

        await act(async () => {
            await vi.advanceTimersByTimeAsync(120_000);
        });

        expect(reads).toHaveLength(0);
    });

    it("gives up after five minutes rather than asking all afternoon", async () => {
        const reads = countReads();
        renderHook(() =>
            usePendingMedia({
                postId: "post-1",
                mediaPending: true,
                onUpdated: vi.fn(),
            }),
        );

        await act(async () => {
            await vi.advanceTimersByTimeAsync(5 * 60_000);
        });
        const atLimit = reads.length;
        expect(atLimit).toBeGreaterThan(0);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(5 * 60_000);
        });

        expect(reads).toHaveLength(atLimit);
    });

    it("stops polling when unmounted", async () => {
        const reads = countReads();
        const { unmount } = renderHook(() =>
            usePendingMedia({
                postId: "post-1",
                mediaPending: true,
                onUpdated: vi.fn(),
            }),
        );

        unmount();
        await act(async () => {
            await vi.advanceTimersByTimeAsync(60_000);
        });

        expect(reads).toHaveLength(0);
    });

    /*
     * A failed poll is not news. The placeholder already says the honest
     * thing, and a toast would interrupt reading to report that a video is
     * still not ready.
     */
    it("says nothing when a poll fails", async () => {
        server.use(
            http.get(`${BASE}/posts/:id`, () =>
                HttpResponse.json(
                    {
                        type: "about:blank",
                        title: "InternalServerError",
                        status: 500,
                        detail: "boom",
                        instance: "/api/v1/posts/post-1",
                    },
                    { status: 500 },
                ),
            ),
        );
        const onUpdated = vi.fn();
        const { result } = renderHook(() =>
            usePendingMedia({
                postId: "post-1",
                mediaPending: true,
                onUpdated,
            }),
        );

        await act(async () => {
            await expect(result.current.refresh()).resolves.toBeUndefined();
        });

        expect(onUpdated).not.toHaveBeenCalled();
        expect(result.current.isRefreshing).toBe(false);
    });
});
