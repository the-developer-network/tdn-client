import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../../tests/msw-server";

// The hook's module graph reaches the API client, which reads localStorage on
// every request — stub it before any module is evaluated.
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

import { useArticles } from "./useArticles";
import type { ArticleSummary } from "../api/article.types";

const BASE = "http://localhost:8080/api/v1";

const makeArticle = (id: string): ArticleSummary => ({
    isSensitive: false,
    id,
    slug: `slug-${id}`,
    title: `Article ${id}`,
    excerpt: "An excerpt.",
    coverImageUrl: null,
    coverImageAlt: null,
    readingTimeMinutes: 4,
    likeCount: 0,
    commentCount: 0,
    isLiked: false,
    isBookmarked: false,
    status: "PUBLISHED",
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    author: {
        id: "user-1",
        username: "testuser",
        avatarUrl: "https://example.com/avatar.png",
    },
    tags: [],
    categories: [],
});

const page = (n: number) =>
    Array.from({ length: n }, (_, i) => makeArticle(`a${i}`));

beforeEach(() => {
    localStorage.clear();
});

describe("useArticles", () => {
    it("starts empty, idle and without an error", () => {
        const { result } = renderHook(() => useArticles());

        expect(result.current.articles).toEqual([]);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it("loads the first page", async () => {
        server.use(
            http.get(`${BASE}/articles`, () =>
                HttpResponse.json({ data: page(3) }),
            ),
        );

        const { result } = renderHook(() => useArticles());
        act(() => {
            result.current.fetchArticles();
        });

        await waitFor(() => expect(result.current.articles).toHaveLength(3));
        expect(result.current.isLoading).toBe(false);
    });

    it("names the reason the API gave when the list fails", async () => {
        server.use(
            http.get(`${BASE}/articles`, () =>
                HttpResponse.json(
                    {
                        type: "about:blank",
                        title: "InternalServerError",
                        status: 500,
                        detail: "Articles are unavailable.",
                        instance: "/api/v1/articles",
                    },
                    { status: 500 },
                ),
            ),
        );

        const { result } = renderHook(() => useArticles());
        act(() => {
            result.current.fetchArticles();
        });

        await waitFor(() =>
            expect(result.current.error).toBe("Articles are unavailable."),
        );
        // A failed first page must not leave the sentinel asking for a second.
        expect(result.current.hasMore).toBe(false);
    });

    describe("pagination", () => {
        // The client unwraps `ApiResponse.data`, so `meta.totalPages` never
        // arrives — a full page of 20 is the only signal another one exists.
        it("treats a full page as a sign there is another", async () => {
            server.use(
                http.get(`${BASE}/articles`, () =>
                    HttpResponse.json({ data: page(20) }),
                ),
            );

            const { result } = renderHook(() => useArticles());
            act(() => {
                result.current.fetchArticles();
            });

            await waitFor(() => expect(result.current.hasMore).toBe(true));
        });

        it("stops when the first page comes back short", async () => {
            server.use(
                http.get(`${BASE}/articles`, () =>
                    HttpResponse.json({ data: page(4) }),
                ),
            );

            const { result } = renderHook(() => useArticles());
            act(() => {
                result.current.fetchArticles();
            });

            await waitFor(() => expect(result.current.hasMore).toBe(false));
        });

        it("appends the next page and repeats the first page's filters", async () => {
            const seen: string[][] = [];
            server.use(
                http.get(`${BASE}/articles`, ({ request }) => {
                    const url = new URL(request.url);
                    seen.push([
                        url.searchParams.get("page")!,
                        ...url.searchParams.getAll("categories"),
                    ]);
                    return HttpResponse.json({
                        data:
                            url.searchParams.get("page") === "1"
                                ? page(20)
                                : page(5),
                    });
                }),
            );

            const { result } = renderHook(() => useArticles());
            act(() => {
                result.current.fetchArticles({ categories: ["BACKEND"] });
            });
            await waitFor(() =>
                expect(result.current.articles).toHaveLength(20),
            );

            await act(async () => {
                await result.current.loadMore();
            });

            expect(result.current.articles).toHaveLength(25);
            expect(result.current.hasMore).toBe(false);
            // Page 2 must narrow the same way page 1 did, or it appends
            // articles from a filter the reader never chose.
            expect(seen).toEqual([
                ["1", "BACKEND"],
                ["2", "BACKEND"],
            ]);
        });

        it("keeps the loaded page when a second one fails", async () => {
            server.use(
                http.get(`${BASE}/articles`, ({ request }) => {
                    const url = new URL(request.url);
                    if (url.searchParams.get("page") === "1") {
                        return HttpResponse.json({ data: page(20) });
                    }
                    return HttpResponse.json(
                        {
                            type: "about:blank",
                            title: "InternalServerError",
                            status: 500,
                            detail: "Nope.",
                            instance: "/api/v1/articles",
                        },
                        { status: 500 },
                    );
                }),
            );

            const { result } = renderHook(() => useArticles());
            act(() => {
                result.current.fetchArticles();
            });
            await waitFor(() =>
                expect(result.current.articles).toHaveLength(20),
            );

            await act(async () => {
                await result.current.loadMore();
            });

            expect(result.current.loadMoreError).toBe("Nope.");
            // The page that did arrive stays on screen.
            expect(result.current.articles).toHaveLength(20);
            expect(result.current.error).toBeNull();
        });
    });

    it("ignores a stale response when the filter changed mid-flight", async () => {
        let resolveFirst: (() => void) | null = null;
        server.use(
            http.get(`${BASE}/articles`, async ({ request }) => {
                const url = new URL(request.url);
                if (url.searchParams.get("categories") === "BACKEND") {
                    await new Promise<void>((resolve) => {
                        resolveFirst = resolve;
                    });
                    return HttpResponse.json({
                        data: [makeArticle("stale")],
                    });
                }
                return HttpResponse.json({ data: [makeArticle("fresh")] });
            }),
        );

        const { result } = renderHook(() => useArticles());
        act(() => {
            result.current.fetchArticles({ categories: ["BACKEND"] });
        });
        act(() => {
            result.current.fetchArticles({ categories: ["AI"] });
        });

        await waitFor(() => expect(result.current.articles).toHaveLength(1));
        expect(result.current.articles[0].id).toBe("fresh");

        // The slow first request lands last; it must not overwrite the list.
        await act(async () => {
            resolveFirst?.();
            await new Promise((resolve) => setTimeout(resolve, 20));
        });

        expect(result.current.articles[0].id).toBe("fresh");
    });

    // The same shape as the post feed, and the same reason: a body that is not
    // a list must fail as this request, never as a `null` sitting in state
    // waiting to crash something later.
    it("keeps the list an array when the body is not one", async () => {
        server.use(
            http.get(`${BASE}/articles`, () =>
                HttpResponse.json({ data: null }),
            ),
        );

        const { result } = renderHook(() => useArticles());

        await act(async () => {
            await result.current.fetchArticles();
        });

        expect(result.current.articles).toEqual([]);
        expect(result.current.error).not.toBeNull();
    });

    it("keeps page 1 on screen when page 2 comes back mis-shaped", async () => {
        server.use(
            http.get(`${BASE}/articles`, ({ request }) => {
                const p = Number(
                    new URL(request.url).searchParams.get("page") ?? "1",
                );
                if (p === 1) return HttpResponse.json({ data: page(20) });
                return HttpResponse.json({ data: null });
            }),
        );

        const { result } = renderHook(() => useArticles());
        await act(async () => {
            await result.current.fetchArticles();
        });
        await act(async () => {
            await result.current.loadMore();
        });

        expect(result.current.articles).toHaveLength(20);
        expect(result.current.loadMoreError).not.toBeNull();
    });
});
