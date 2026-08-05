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

import type { Post } from "../api/feed.types";
import { useBookmarks } from "./useBookmarks";

beforeEach(() => {
    localStorage.clear();
});

const BASE = "http://localhost:8080/api/v1";

// Minimal Post fixture matching the shape returned by the default MSW handler
const mockPost: Post = {
    id: "post-1",
    content: "Hello world",
    type: "COMMUNITY",
    mediaUrls: [],
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0,
    isLiked: false,
    isBookmarked: false,
    author: {
        id: "user-1",
        username: "testuser",
        fullName: "Test User",
        avatarUrl: "https://example.com/avatar.png",
    },
    tags: [],
};

describe("useBookmarks", () => {
    it("loads posts and comments on mount via the initial useEffect", async () => {
        const { result } = renderHook(() => useBookmarks());

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.posts).toHaveLength(1);
        expect(result.current.posts[0].id).toBe("post-1");
        expect(result.current.comments).toHaveLength(0);
        expect(result.current.error).toBeNull();
    });

    it("returns an empty list when the API returns no bookmarks", async () => {
        server.use(
            http.get(`${BASE}/posts/bookmarks`, () =>
                HttpResponse.json({ data: { posts: [], comments: [] } }),
            ),
        );

        const { result } = renderHook(() => useBookmarks());

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.posts).toHaveLength(0);
        expect(result.current.error).toBeNull();
    });

    // CHANGED EXPECTATION: this used to assert the fixed string
    // "Bookmarks could not be loaded." for every failure alike. A dropped
    // connection is now named as one, which is the whole point of routing
    // through `getErrorMessage`.
    it("names a connection failure on mount", async () => {
        server.use(
            http.get(`${BASE}/posts/bookmarks`, () => HttpResponse.error()),
        );

        const { result } = renderHook(() => useBookmarks());

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.error).toBe(
            "Unable to connect. Please check your internet connection.",
        );
        expect(result.current.posts).toHaveLength(0);
    });

    it("re-fetches successfully after an error when retry() is called with a working API", async () => {
        server.use(
            http.get(`${BASE}/posts/bookmarks`, () => HttpResponse.error()),
        );

        const { result } = renderHook(() => useBookmarks());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.error).not.toBeNull();

        // Restore the happy-path handler, then retry
        server.use(
            http.get(`${BASE}/posts/bookmarks`, () =>
                HttpResponse.json({
                    data: { posts: [mockPost], comments: [] },
                }),
            ),
        );

        await act(async () => {
            await result.current.retry();
        });

        expect(result.current.error).toBeNull();
        expect(result.current.posts).toHaveLength(1);
    });

    // `/posts/bookmarks` takes `page`/`limit` (max 100). The hook asked for
    // page 1 and never asked again, and `BookmarksPage` wired `hasMore` to a
    // literal `false`, so bookmark 21 onwards was unreachable.
    describe("pagination", () => {
        /** Serves `total` bookmarked posts, honouring `page`/`limit`. */
        function serveBookmarks(total: number) {
            const all = Array.from({ length: total }, (_, i) => ({
                ...mockPost,
                id: `post-${i}`,
            }));

            server.use(
                http.get(`${BASE}/posts/bookmarks`, ({ request }) => {
                    const q = new URL(request.url).searchParams;
                    const page = Number(q.get("page") ?? 1);
                    const limit = Number(q.get("limit") ?? 20);
                    const start = (page - 1) * limit;
                    return HttpResponse.json({
                        data: {
                            posts: all.slice(start, start + limit),
                            comments: [],
                        },
                        meta: {
                            postTotal: total,
                            commentTotal: 0,
                            page,
                            timestamp: new Date().toISOString(),
                        },
                    });
                }),
            );
        }

        it("reaches the bookmarks past the first page", async () => {
            serveBookmarks(25);

            const { result } = renderHook(() => useBookmarks());
            await waitFor(() => expect(result.current.isLoading).toBe(false));

            expect(result.current.posts).toHaveLength(20);
            expect(result.current.hasMore).toBe(true);

            await act(async () => {
                result.current.loadMore();
            });

            await waitFor(() => expect(result.current.posts).toHaveLength(25));
            expect(result.current.hasMore).toBe(false);
        });

        it("reports no more to load when the first page is short", async () => {
            serveBookmarks(3);

            const { result } = renderHook(() => useBookmarks());
            await waitFor(() => expect(result.current.isLoading).toBe(false));

            expect(result.current.posts).toHaveLength(3);
            expect(result.current.hasMore).toBe(false);
        });

        it("starts again from page one after retry", async () => {
            serveBookmarks(25);

            const { result } = renderHook(() => useBookmarks());
            await waitFor(() => expect(result.current.isLoading).toBe(false));
            await act(async () => {
                result.current.loadMore();
            });
            await waitFor(() => expect(result.current.posts).toHaveLength(25));

            await act(async () => {
                await result.current.retry();
            });

            // Not 45: retry replaces the list, it does not staple page one
            // onto the pages already collected.
            expect(result.current.posts).toHaveLength(20);
            expect(result.current.hasMore).toBe(true);
        });
    });

    // Every failure was reported as "Bookmarks could not be loaded.", so a
    // rate limit and a server fault read identically and the reason the API
    // gave went to the console instead of the screen.
    it("reports the reason the API gave", async () => {
        server.use(
            http.get(`${BASE}/posts/bookmarks`, () =>
                HttpResponse.json(
                    {
                        type: "about:blank",
                        title: "TooManyRequests",
                        status: 429,
                        detail: "Too many requests, please try again later.",
                    },
                    { status: 429 },
                ),
            ),
        );

        const { result } = renderHook(() => useBookmarks());

        await waitFor(() =>
            expect(result.current.error).toBe(
                "Too many requests, please try again later.",
            ),
        );
    });

    it("removes a post from local state immediately via removePost() without an API call", async () => {
        const { result } = renderHook(() => useBookmarks());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.posts).toHaveLength(1);

        act(() => {
            result.current.removePost("post-1");
        });

        expect(result.current.posts).toHaveLength(0);
    });
});
