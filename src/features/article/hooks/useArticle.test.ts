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

import { useArticle } from "./useArticle";

const BASE = "http://localhost:8080/api/v1";

const notFound = () =>
    HttpResponse.json(
        {
            type: "about:blank",
            title: "ArticleNotFoundError",
            status: 404,
            detail: "Article not found.",
            instance: "/api/v1/articles/x",
        },
        { status: 404 },
    );

beforeEach(() => {
    localStorage.clear();
});

describe("useArticle", () => {
    it("is loading until the article for the current slug has arrived", async () => {
        server.use(
            http.get(`${BASE}/articles/:slug`, ({ params }) =>
                HttpResponse.json({
                    data: { slug: params.slug, title: "Hello", body: "# hi" },
                }),
            ),
        );

        const { result } = renderHook(() => useArticle("hello"));

        expect(result.current.isLoading).toBe(true);
        expect(result.current.article).toBeNull();

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.article).toMatchObject({ title: "Hello" });
    });

    it("reports a missing article without exposing it as anything else", async () => {
        // A draft belonging to someone else answers 404 too — the hook must
        // treat it as an ordinary not-found, never "exists but unpublished".
        server.use(http.get(`${BASE}/articles/:slug`, notFound));

        const { result } = renderHook(() => useArticle("secret-draft"));

        await waitFor(() =>
            expect(result.current.error).toBe("Article not found."),
        );
        expect(result.current.article).toBeNull();
        expect(result.current.isLoading).toBe(false);
    });

    it("retry returns to the loading state instead of showing the stale error", async () => {
        let attempt = 0;
        server.use(
            http.get(`${BASE}/articles/:slug`, () => {
                attempt += 1;
                if (attempt === 1) return notFound();
                return HttpResponse.json({
                    data: { slug: "hello", title: "Second try", body: "" },
                });
            }),
        );

        const { result } = renderHook(() => useArticle("hello"));
        await waitFor(() => expect(result.current.error).not.toBeNull());

        act(() => {
            result.current.retry();
        });

        expect(result.current.isLoading).toBe(true);
        expect(result.current.error).toBeNull();

        await waitFor(() =>
            expect(result.current.article).toMatchObject({
                title: "Second try",
            }),
        );
    });

    it("does not show the previous article while the next one loads", async () => {
        server.use(
            http.get(`${BASE}/articles/:slug`, ({ params }) =>
                HttpResponse.json({
                    data: { slug: params.slug, title: `T-${params.slug}` },
                }),
            ),
        );

        const { result, rerender } = renderHook(
            ({ slug }) => useArticle(slug),
            { initialProps: { slug: "first" } },
        );
        await waitFor(() =>
            expect(result.current.article).toMatchObject({ title: "T-first" }),
        );

        rerender({ slug: "second" });

        expect(result.current.isLoading).toBe(true);
        expect(result.current.article).toBeNull();

        await waitFor(() =>
            expect(result.current.article).toMatchObject({
                title: "T-second",
            }),
        );
    });
});
