import { act, renderHook, waitFor } from "@testing-library/react";
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
import { useQuotes } from "./useQuotes";

const BASE = "http://localhost:8080/api/v1";

const makeQuote = (id: string): Post => ({
    id,
    content: `quote ${id}`,
    type: "COMMUNITY",
    mediaUrls: [],
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0,
    quoteCount: 0,
    isLiked: false,
    isBookmarked: false,
    author: {
        id: "user-1",
        username: "testuser",
        avatarUrl: "https://example.com/avatar.png",
    },
    quotedPost: {
        id: "post-1",
        content: "the original",
        mediaUrls: [],
        createdAt: new Date().toISOString(),
        author: {
            id: "user-2",
            username: "veli",
            avatarUrl: "https://example.com/veli.png",
        },
    },
});

const page = (n: number) =>
    Array.from({ length: n }, (_, i) => makeQuote(`quote-${i}`));

beforeEach(() => {
    localStorage.clear();
});

describe("useQuotes", () => {
    it("fetches the first page and stops loading", async () => {
        server.use(
            http.get(`${BASE}/posts/:postId/quotes`, () =>
                HttpResponse.json({ data: [makeQuote("quote-1")] }),
            ),
        );

        const { result } = renderHook(() => useQuotes("post-1"));
        await act(async () => {
            await result.current.fetchQuotes();
        });

        expect(result.current.quotes).toHaveLength(1);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it("asks for the post's own quotes endpoint, newest page first", async () => {
        const seen: string[] = [];
        server.use(
            http.get(`${BASE}/posts/:postId/quotes`, ({ request, params }) => {
                const url = new URL(request.url);
                seen.push(
                    `${params.postId}:${url.searchParams.get("page")}:${url.searchParams.get("limit")}`,
                );
                return HttpResponse.json({ data: [] });
            }),
        );

        const { result } = renderHook(() => useQuotes("post-42"));
        await act(async () => {
            await result.current.fetchQuotes();
        });

        expect(seen).toEqual(["post-42:1:20"]);
    });

    it("marks a short page as the last one", async () => {
        server.use(
            http.get(`${BASE}/posts/:postId/quotes`, () =>
                HttpResponse.json({ data: page(3) }),
            ),
        );

        const { result } = renderHook(() => useQuotes("post-1"));
        await act(async () => {
            await result.current.fetchQuotes();
        });

        expect(result.current.hasMore).toBe(false);
    });

    it("appends the next page and keeps paging while pages are full", async () => {
        let call = 0;
        server.use(
            http.get(`${BASE}/posts/:postId/quotes`, () => {
                call += 1;
                return HttpResponse.json({
                    data: call === 1 ? page(20) : [makeQuote("late")],
                });
            }),
        );

        const { result } = renderHook(() => useQuotes("post-1"));
        await act(async () => {
            await result.current.fetchQuotes();
        });
        expect(result.current.hasMore).toBe(true);

        await act(async () => {
            await result.current.loadMore();
        });

        expect(result.current.quotes).toHaveLength(21);
        expect(result.current.hasMore).toBe(false);
    });

    it("surfaces a 404 for a deleted original as a list error, not a crash", async () => {
        server.use(
            http.get(`${BASE}/posts/:postId/quotes`, () =>
                HttpResponse.json(
                    {
                        type: "about:blank",
                        title: "NotFoundError",
                        status: 404,
                        detail: "Post not found",
                    },
                    { status: 404 },
                ),
            ),
        );

        const { result } = renderHook(() => useQuotes("post-1"));
        await act(async () => {
            await result.current.fetchQuotes();
        });

        await waitFor(() => expect(result.current.error).not.toBeNull());
        expect(result.current.quotes).toEqual([]);
    });

    it("rejects a payload that is not a list before it becomes state", async () => {
        server.use(
            http.get(`${BASE}/posts/:postId/quotes`, () =>
                HttpResponse.json({ data: null }),
            ),
        );

        const { result } = renderHook(() => useQuotes("post-1"));
        await act(async () => {
            await result.current.fetchQuotes();
        });

        expect(result.current.quotes).toEqual([]);
        expect(result.current.error).not.toBeNull();
    });

    it("does not advance the page counter when loading more fails", async () => {
        const pages: string[] = [];
        let call = 0;
        server.use(
            http.get(`${BASE}/posts/:postId/quotes`, ({ request }) => {
                call += 1;
                pages.push(new URL(request.url).searchParams.get("page") ?? "");
                if (call === 1) return HttpResponse.json({ data: page(20) });
                if (call === 2) return new HttpResponse(null, { status: 500 });
                return HttpResponse.json({ data: [makeQuote("late")] });
            }),
        );

        const { result } = renderHook(() => useQuotes("post-1"));
        await act(async () => {
            await result.current.fetchQuotes();
        });
        await act(async () => {
            await result.current.loadMore();
        });
        expect(result.current.loadMoreError).not.toBeNull();

        await act(async () => {
            await result.current.loadMore();
        });

        expect(pages).toEqual(["1", "2", "2"]);
        expect(result.current.quotes).toHaveLength(21);
    });

    it("removes a deleted quote from the list", async () => {
        server.use(
            http.get(`${BASE}/posts/:postId/quotes`, () =>
                HttpResponse.json({ data: [makeQuote("quote-0")] }),
            ),
        );

        const { result } = renderHook(() => useQuotes("post-1"));
        await act(async () => {
            await result.current.fetchQuotes();
        });

        act(() => result.current.removeQuote("quote-0"));

        expect(result.current.quotes).toEqual([]);
    });

    it("prepends a freshly created quote", async () => {
        server.use(
            http.get(`${BASE}/posts/:postId/quotes`, () =>
                HttpResponse.json({ data: [makeQuote("quote-old")] }),
            ),
        );

        const { result } = renderHook(() => useQuotes("post-1"));
        await act(async () => {
            await result.current.fetchQuotes();
        });

        act(() => result.current.addQuote(makeQuote("quote-new")));

        expect(result.current.quotes[0].id).toBe("quote-new");
        expect(result.current.quotes).toHaveLength(2);
    });

    it("does not fetch without a post id", async () => {
        let called = false;
        server.use(
            http.get(`${BASE}/posts/:postId/quotes`, () => {
                called = true;
                return HttpResponse.json({ data: [] });
            }),
        );

        const { result } = renderHook(() => useQuotes(undefined));
        await act(async () => {
            await result.current.fetchQuotes();
        });

        expect(called).toBe(false);
        expect(result.current.isLoading).toBe(false);
    });
});
