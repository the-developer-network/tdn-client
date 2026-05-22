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

    it("sets an error message when the API fails on mount", async () => {
        server.use(
            http.get(`${BASE}/posts/bookmarks`, () => HttpResponse.error()),
        );

        const { result } = renderHook(() => useBookmarks());

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.error).toBe("Bookmarks could not be loaded.");
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
