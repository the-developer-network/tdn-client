import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../../tests/msw-server";

// The API client reads `localStorage` on every request, and jsdom's own
// Storage.clear() is broken — stub it before any module is evaluated.
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

import { articleApi } from "./article.api";

const BASE = "http://localhost:8080/api/v1";

beforeEach(() => {
    localStorage.clear();
});

describe("articleApi", () => {
    describe("getArticles", () => {
        it("unwraps the envelope and defaults page and limit", async () => {
            let url: URL | null = null;
            server.use(
                http.get(`${BASE}/articles`, ({ request }) => {
                    url = new URL(request.url);
                    return HttpResponse.json({ data: [] });
                }),
            );

            const result = await articleApi.getArticles();

            expect(result).toEqual([]);
            expect(url!.searchParams.get("page")).toBe("1");
            expect(url!.searchParams.get("limit")).toBe("20");
        });

        it("repeats `categories` rather than joining them", async () => {
            let url: URL | null = null;
            server.use(
                http.get(`${BASE}/articles`, ({ request }) => {
                    url = new URL(request.url);
                    return HttpResponse.json({ data: [] });
                }),
            );

            await articleApi.getArticles({
                categories: ["BACKEND", "AI"],
                tag: "fastify",
                authorUsername: "testuser",
            });

            expect(url!.searchParams.getAll("categories")).toEqual([
                "BACKEND",
                "AI",
            ]);
            expect(url!.searchParams.get("tag")).toBe("fastify");
            expect(url!.searchParams.get("authorUsername")).toBe("testuser");
        });

        it("omits followedOnly unless it is asked for", async () => {
            let url: URL | null = null;
            server.use(
                http.get(`${BASE}/articles`, ({ request }) => {
                    url = new URL(request.url);
                    return HttpResponse.json({ data: [] });
                }),
            );

            await articleApi.getArticles({ followedOnly: false });
            expect(url!.searchParams.has("followedOnly")).toBe(false);

            await articleApi.getArticles({ followedOnly: true });
            expect(url!.searchParams.get("followedOnly")).toBe("true");
        });

        it("sends the token when the reader has one, so isLiked is real", async () => {
            localStorage.setItem("access_token", "token-123");
            let auth: string | null = null;
            server.use(
                http.get(`${BASE}/articles`, ({ request }) => {
                    auth = request.headers.get("Authorization");
                    return HttpResponse.json({ data: [] });
                }),
            );

            await articleApi.getArticles();

            expect(auth).toBe("Bearer token-123");
        });
    });

    describe("getArticleBySlug", () => {
        it("reads by slug and returns the body", async () => {
            server.use(
                http.get(`${BASE}/articles/:slug`, ({ params }) =>
                    HttpResponse.json({
                        data: { slug: params.slug, body: "# hi" },
                    }),
                ),
            );

            const article = await articleApi.getArticleBySlug("my-article");

            expect(article).toMatchObject({
                slug: "my-article",
                body: "# hi",
            });
        });

        it("escapes a slug so it cannot break out of the path", async () => {
            let path: string | null = null;
            server.use(
                http.get(`${BASE}/articles/:slug`, ({ request }) => {
                    path = new URL(request.url).pathname;
                    return HttpResponse.json({ data: {} });
                }),
            );

            await articleApi.getArticleBySlug("a b");

            expect(path).toBe("/api/v1/articles/a%20b");
        });
    });

    describe("like and bookmark", () => {
        // Posts undo with `/unlike` and `/unsave`; articles undo with a DELETE
        // to the same path they were created on. Copying the feed module
        // verbatim produces a 404 on every undo, so the paths are asserted.
        it.each([
            ["likeArticle", "POST", "/api/v1/articles/article-1/like"],
            ["unlikeArticle", "DELETE", "/api/v1/articles/article-1/like"],
            ["bookmarkArticle", "POST", "/api/v1/articles/article-1/bookmark"],
            [
                "unbookmarkArticle",
                "DELETE",
                "/api/v1/articles/article-1/bookmark",
            ],
        ] as const)("%s issues %s %s", async (method, verb, expected) => {
            let seen: { method: string; path: string } | null = null;
            const record = ({ request }: { request: Request }) => {
                seen = {
                    method: request.method,
                    path: new URL(request.url).pathname,
                };
                return new HttpResponse(null, { status: 204 });
            };

            server.use(
                http.post(`${BASE}/articles/:id/like`, record),
                http.delete(`${BASE}/articles/:id/like`, record),
                http.post(`${BASE}/articles/:id/bookmark`, record),
                http.delete(`${BASE}/articles/:id/bookmark`, record),
            );

            await articleApi[method]("article-1");

            expect(seen).toEqual({ method: verb, path: expected });
        });
    });
});
