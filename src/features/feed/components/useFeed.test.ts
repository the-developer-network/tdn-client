import { act, renderHook } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../../tests/msw-server";

// apiClient reads localStorage.getItem at runtime; the jsdom 29 Map-backed stub
// must be in place before any module that reaches client.ts is evaluated.
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
import { useFeed } from "./useFeed";

const BASE = "http://localhost:8080/api/v1";

const mockPost: Post = {
    isSensitive: false,
    mediaPending: false,
    id: "post-1",
    content: "Hello world",
    type: "COMMUNITY",
    mediaUrls: [],
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0,
    isLiked: false,
    isBookmarked: false,
    quoteCount: 0,
    quotedPost: null,
    author: {
        id: "user-1",
        username: "testuser",
        fullName: "Test User",
        avatarUrl: "https://example.com/avatar.png",
    },
    tags: [],
};

beforeEach(() => {
    localStorage.clear();
});

describe("useFeed", () => {
    it("fetchPosts() populates posts and clears isLoading on success", async () => {
        const { result } = renderHook(() => useFeed());

        await act(async () => {
            await result.current.fetchPosts("COMMUNITY");
        });

        expect(result.current.posts).toHaveLength(1);
        expect(result.current.posts[0].id).toBe("post-1");
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it("fetchPosts() sets an error message when the API fails", async () => {
        server.use(http.get(`${BASE}/posts`, () => HttpResponse.error()));

        const { result } = renderHook(() => useFeed());

        await act(async () => {
            await result.current.fetchPosts("COMMUNITY");
        });

        expect(result.current.error).toBe("Posts could not be loaded.");
        expect(result.current.posts).toHaveLength(0);
        expect(result.current.isLoading).toBe(false);
    });

    it("hasMore is false when the server returns fewer than 20 posts", async () => {
        // Default handler returns 1 post (< PAGE_LIMIT of 20)
        const { result } = renderHook(() => useFeed());

        await act(async () => {
            await result.current.fetchPosts("COMMUNITY");
        });

        expect(result.current.hasMore).toBe(false);
    });

    it("loadMore() fetches page 2 and appends results when hasMore is true", async () => {
        const page1 = Array.from({ length: 20 }, (_, i) => ({
            ...mockPost,
            id: `post-${i + 1}`,
        }));

        server.use(
            http.get(`${BASE}/posts`, ({ request }) => {
                const url = new URL(request.url);
                const page = Number(url.searchParams.get("page") ?? "1");
                if (page === 1) return HttpResponse.json({ data: page1 });
                return HttpResponse.json({ data: [mockPost] });
            }),
        );

        const { result } = renderHook(() => useFeed());

        await act(async () => {
            await result.current.fetchPosts("COMMUNITY");
        });
        expect(result.current.posts).toHaveLength(20);
        expect(result.current.hasMore).toBe(true);

        await act(async () => {
            await result.current.loadMore();
        });

        expect(result.current.posts).toHaveLength(21);
        expect(result.current.hasMore).toBe(false);
    });

    // The hook no longer tracks which tab is open — FeedPage reads that from
    // the URL and hands it in — so switching tabs is just another fetch, and
    // what matters is that the second one replaces the first rather than
    // appending to it.
    it("a fetch for another type replaces the list rather than appending", async () => {
        const { result } = renderHook(() => useFeed());

        await act(async () => {
            await result.current.fetchPosts("COMMUNITY");
        });
        expect(result.current.posts).toHaveLength(1);

        await act(async () => {
            await result.current.fetchPosts("TECH_NEWS");
        });

        expect(result.current.posts).toHaveLength(1);
        expect(result.current.isLoading).toBe(false);
    });

    it("starts from a restored list and pages on from where it left off", async () => {
        let page2Params = new URLSearchParams();
        server.use(
            http.get(`${BASE}/posts`, ({ request }) => {
                page2Params = new URL(request.url).searchParams;
                return HttpResponse.json({ data: [mockPost] });
            }),
        );

        const restored = [
            { ...mockPost, id: "restored-1" },
            { ...mockPost, id: "restored-2" },
        ];
        const { result } = renderHook(() =>
            useFeed(false, [], {
                posts: restored,
                page: 2,
                hasMore: true,
                type: "TECH_NEWS",
            }),
        );

        // Present on the very first render: a restored feed has to be in the
        // first commit, or the reader watches an empty column flash past.
        expect(result.current.posts).toHaveLength(2);
        expect(result.current.page).toBe(2);

        await act(async () => {
            await result.current.loadMore();
        });

        // Page 3, still narrowed to the tab the snapshot was taken from —
        // without the seeded type this would ask for an unfiltered page 2.
        expect(page2Params.get("page")).toBe("3");
        expect(page2Params.get("type")).toBe("TECH_NEWS");
    });

    it("addPost() prepends a post and removePost() removes it without any API call", async () => {
        const { result } = renderHook(() => useFeed());

        await act(async () => {
            await result.current.fetchPosts("COMMUNITY");
        });
        expect(result.current.posts).toHaveLength(1);

        const newPost: Post = { ...mockPost, id: "post-new" };

        act(() => {
            result.current.addPost(newPost);
        });
        expect(result.current.posts).toHaveLength(2);
        expect(result.current.posts[0].id).toBe("post-new");

        act(() => {
            result.current.removePost("post-new");
        });
        expect(result.current.posts).toHaveLength(1);
    });

    it("fetchPosts() forwards categories to the API", async () => {
        let capturedCategories: string[] = [];

        server.use(
            http.get(`${BASE}/posts`, ({ request }) => {
                const url = new URL(request.url);
                capturedCategories = url.searchParams.getAll("categories");
                return HttpResponse.json({ data: [mockPost] });
            }),
        );

        const { result } = renderHook(() => useFeed(false, ["AI", "BACKEND"]));

        await act(async () => {
            await result.current.fetchPosts("TECH_NEWS");
        });

        expect(capturedCategories).toEqual(["AI", "BACKEND"]);
    });

    it("loadMore() forwards categories to the API", async () => {
        const page1 = Array.from({ length: 20 }, (_, i) => ({
            ...mockPost,
            id: `post-${i + 1}`,
        }));
        let page2Categories: string[] = [];

        server.use(
            http.get(`${BASE}/posts`, ({ request }) => {
                const url = new URL(request.url);
                const page = Number(url.searchParams.get("page") ?? "1");
                if (page === 1) return HttpResponse.json({ data: page1 });
                page2Categories = url.searchParams.getAll("categories");
                return HttpResponse.json({ data: [mockPost] });
            }),
        );

        const { result } = renderHook(() => useFeed(false, ["FRONTEND"]));

        await act(async () => {
            await result.current.fetchPosts("TECH_NEWS");
        });
        expect(result.current.hasMore).toBe(true);

        await act(async () => {
            await result.current.loadMore();
        });

        expect(page2Categories).toEqual(["FRONTEND"]);
    });

    it("ignores a slow response that is superseded by a newer fetch", async () => {
        const slowPost = { ...mockPost, id: "slow-post" };
        const fastPost = { ...mockPost, id: "fast-post" };

        server.use(
            http.get(`${BASE}/posts`, async ({ request }) => {
                const type = new URL(request.url).searchParams.get("type");
                if (type === "COMMUNITY") {
                    // Lands after the TECH_NEWS request that replaced it.
                    await new Promise((resolve) => setTimeout(resolve, 50));
                    return HttpResponse.json({ data: [slowPost] });
                }
                return HttpResponse.json({ data: [fastPost] });
            }),
        );

        const { result } = renderHook(() => useFeed());

        await act(async () => {
            const slow = result.current.fetchPosts("COMMUNITY");
            const fast = result.current.fetchPosts("TECH_NEWS");
            await Promise.all([slow, fast]);
        });

        expect(result.current.posts).toHaveLength(1);
        expect(result.current.posts[0].id).toBe("fast-post");
        expect(result.current.isLoading).toBe(false);
    });

    it("carries the original params into loadMore instead of rebuilding them", async () => {
        let page2Tag: string | null = "not-sent";
        const page1 = Array.from({ length: 20 }, (_, i) => ({
            ...mockPost,
            id: `tagged-${i}`,
        }));

        server.use(
            http.get(`${BASE}/posts`, ({ request }) => {
                const url = new URL(request.url);
                if (Number(url.searchParams.get("page") ?? "1") === 1) {
                    return HttpResponse.json({ data: page1 });
                }
                page2Tag = url.searchParams.get("tag");
                return HttpResponse.json({ data: [mockPost] });
            }),
        );

        const { result } = renderHook(() => useFeed());

        await act(async () => {
            await result.current.fetchPosts({ tag: "react" });
        });
        await act(async () => {
            await result.current.loadMore();
        });

        expect(page2Tag).toBe("react");
    });

    /**
     * Regression. The body used to be committed and only then read for
     * `.length`, so the throw left `posts` holding a `null` while the reader
     * saw an ordinary error. Nothing surfaced it until the page unmounted and
     * the feed snapshot read `posts.length` — which took the whole route down,
     * and with it the redirect the app was in the middle of.
     */
    it("keeps the list an array when the body is not one", async () => {
        server.use(
            http.get(`${BASE}/posts`, () => HttpResponse.json({ data: null })),
        );

        const { result } = renderHook(() => useFeed());

        await act(async () => {
            await result.current.fetchPosts("COMMUNITY");
        });

        expect(result.current.posts).toEqual([]);
        expect(result.current.error).toBe("Posts could not be loaded.");
    });

    it("keeps page 1 on screen when page 2 comes back mis-shaped", async () => {
        const page1 = Array.from({ length: 20 }, (_, i) => ({
            ...mockPost,
            id: `post-${i + 1}`,
        }));
        server.use(
            http.get(`${BASE}/posts`, ({ request }) => {
                const page = Number(
                    new URL(request.url).searchParams.get("page") ?? "1",
                );
                if (page === 1) return HttpResponse.json({ data: page1 });
                return HttpResponse.json({ data: null });
            }),
        );

        const { result } = renderHook(() => useFeed());
        await act(async () => {
            await result.current.fetchPosts("COMMUNITY");
        });
        await act(async () => {
            await result.current.loadMore();
        });

        expect(result.current.posts).toHaveLength(20);
        expect(result.current.loadMoreError).not.toBeNull();
    });
});
