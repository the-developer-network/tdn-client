import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../../tests/msw-server";

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

import { useMyArticles } from "./useMyArticles";
import type { ArticleSummary } from "../api/article.types";

const BASE = "http://localhost:8080/api/v1";

const makeArticle = (id: string): ArticleSummary => ({
    id,
    slug: `slug-${id}`,
    title: `Article ${id}`,
    excerpt: "",
    coverImageUrl: null,
    coverImageAlt: null,
    readingTimeMinutes: 1,
    likeCount: 0,
    commentCount: 0,
    isLiked: false,
    isBookmarked: false,
    status: "DRAFT",
    publishedAt: null,
    createdAt: new Date().toISOString(),
    author: { id: "user-1", username: "testuser", avatarUrl: "" },
    tags: [],
    categories: [],
});

const page = (n: number) =>
    Array.from({ length: n }, (_, i) => makeArticle(`a${i}`));

beforeEach(() => {
    localStorage.clear();
});

describe("useMyArticles", () => {
    it("asks for the status it was given", async () => {
        let url: URL | null = null;
        server.use(
            http.get(`${BASE}/articles/me`, ({ request }) => {
                url = new URL(request.url);
                return HttpResponse.json({ data: page(2) });
            }),
        );

        const { result } = renderHook(() => useMyArticles());
        act(() => {
            void result.current.fetchMine("DRAFT");
        });

        await waitFor(() => expect(result.current.articles).toHaveLength(2));
        expect(url!.searchParams.get("status")).toBe("DRAFT");
    });

    it("omits the status when asked for everything", async () => {
        let url: URL | null = null;
        server.use(
            http.get(`${BASE}/articles/me`, ({ request }) => {
                url = new URL(request.url);
                return HttpResponse.json({ data: [] });
            }),
        );

        const { result } = renderHook(() => useMyArticles());
        act(() => {
            void result.current.fetchMine();
        });

        await waitFor(() => expect(url).not.toBeNull());
        expect(url!.searchParams.has("status")).toBe(false);
    });

    // This endpoint is the only one that returns drafts, so it is always
    // authenticated — never flagged public, which would replay it anonymously
    // on a stale token and quietly come back with nothing.
    it("sends the token", async () => {
        localStorage.setItem("access_token", "token-123");
        let auth: string | null = null;
        server.use(
            http.get(`${BASE}/articles/me`, ({ request }) => {
                auth = request.headers.get("Authorization");
                return HttpResponse.json({ data: [] });
            }),
        );

        const { result } = renderHook(() => useMyArticles());
        act(() => {
            void result.current.fetchMine("DRAFT");
        });

        await waitFor(() => expect(auth).toBe("Bearer token-123"));
    });

    it("keeps the status when loading the next page", async () => {
        const seen: string[] = [];
        server.use(
            http.get(`${BASE}/articles/me`, ({ request }) => {
                const url = new URL(request.url);
                seen.push(
                    `${url.searchParams.get("page")}:${url.searchParams.get("status")}`,
                );
                return HttpResponse.json({
                    data:
                        url.searchParams.get("page") === "1"
                            ? page(20)
                            : page(3),
                });
            }),
        );

        const { result } = renderHook(() => useMyArticles());
        act(() => {
            void result.current.fetchMine("ARCHIVED");
        });
        await waitFor(() => expect(result.current.articles).toHaveLength(20));

        await act(async () => {
            await result.current.loadMore();
        });

        expect(result.current.articles).toHaveLength(23);
        // Page 2 must narrow the same way, or archived rows get mixed with
        // whatever the unfiltered second page returns.
        expect(seen).toEqual(["1:ARCHIVED", "2:ARCHIVED"]);
    });

    it("reports a failure and stops asking for more", async () => {
        server.use(
            http.get(`${BASE}/articles/me`, () =>
                HttpResponse.json(
                    {
                        type: "about:blank",
                        title: "InternalServerError",
                        status: 500,
                        detail: "Nope.",
                        instance: "/api/v1/articles/me",
                    },
                    { status: 500 },
                ),
            ),
        );

        const { result } = renderHook(() => useMyArticles());
        act(() => {
            void result.current.fetchMine("DRAFT");
        });

        await waitFor(() => expect(result.current.error).toBe("Nope."));
        expect(result.current.hasMore).toBe(false);
    });

    it("ignores a stale response when the status changed mid-flight", async () => {
        let releaseFirst: (() => void) | null = null;
        server.use(
            http.get(`${BASE}/articles/me`, async ({ request }) => {
                const status = new URL(request.url).searchParams.get("status");
                if (status === "DRAFT") {
                    await new Promise<void>((resolve) => {
                        releaseFirst = resolve;
                    });
                    return HttpResponse.json({ data: [makeArticle("stale")] });
                }
                return HttpResponse.json({ data: [makeArticle("fresh")] });
            }),
        );

        const { result } = renderHook(() => useMyArticles());
        act(() => {
            void result.current.fetchMine("DRAFT");
        });
        act(() => {
            void result.current.fetchMine("PUBLISHED");
        });

        await waitFor(() => expect(result.current.articles).toHaveLength(1));
        expect(result.current.articles[0].id).toBe("fresh");

        await act(async () => {
            releaseFirst?.();
            await new Promise((resolve) => setTimeout(resolve, 20));
        });

        // The slow draft request lands last; showing drafts under the
        // published filter is exactly the bug this guards.
        expect(result.current.articles[0].id).toBe("fresh");
    });
});
