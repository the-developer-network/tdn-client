import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../../tests/msw-server";

// apiClient reads localStorage on every request and `useAuthStore` persists
// into it; jsdom 29's Storage.clear() is broken, so stub it before imports run.
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

import { useAuthStore } from "../../../core/auth/auth.store";
import { useToastStore } from "../../../shared/store/toast.store";
import type { PostCategory } from "../../feed/api/feed.types";
import {
    BOT_PAGE_SIZE,
    useOnboardingSuggestions,
} from "./useOnboardingSuggestions";

const BASE = "http://localhost:8080/api/v1";

function bot(id: string, overrides: Record<string, unknown> = {}) {
    return {
        userId: id,
        username: id,
        fullName: `${id} name`,
        avatarUrl: "https://example.com/a.png",
        bannerUrl: "https://example.com/b.png",
        bio: "Tech Developer News",
        categories: ["BACKEND"],
        followersCount: 42,
        isFollowing: false,
        ...overrides,
    };
}

/** Serves `/profiles/bots`, slicing by the offset the hook asked for. */
function serveBots(all: ReturnType<typeof bot>[]) {
    server.use(
        http.get(`${BASE}/profiles/bots`, ({ request }) => {
            const params = new URL(request.url).searchParams;
            const offset = Number(params.get("offset") ?? 0);
            const limit = Number(params.get("limit") ?? 20);
            return HttpResponse.json({
                data: all.slice(offset, offset + limit),
            });
        }),
    );
}

beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState(useAuthStore.getInitialState());
    useToastStore.setState({ toasts: [] });
});

describe("useOnboardingSuggestions", () => {
    it("lists the bots the endpoint returns", async () => {
        serveBots([bot("typescript"), bot("golang")]);

        const { result } = renderHook(() =>
            useOnboardingSuggestions(["BACKEND"]),
        );
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.accounts.map((a) => a.userId)).toEqual([
            "typescript",
            "golang",
        ]);
        expect(result.current.error).toBeNull();
    });

    it("keeps the bio, follower count, fields and follow state", async () => {
        serveBots([
            bot("react", {
                bio: "a bio",
                categories: ["FRONTEND", "MOBILE"],
                followersCount: 99,
                isFollowing: true,
            }),
        ]);

        const { result } = renderHook(() =>
            useOnboardingSuggestions(["FRONTEND"]),
        );
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.accounts[0]).toEqual({
            userId: "react",
            username: "react",
            fullName: "react name",
            avatarUrl: "https://example.com/a.png",
            bio: "a bio",
            followersCount: 99,
            categories: ["FRONTEND", "MOBILE"],
            isFollowing: true,
        });
    });

    // A bot matches on *any* of its categories, so one comma-joined request
    // answers every picked field — one request per field would refetch the
    // same bots and spend the 100/minute budget doing it.
    it("sends every picked field as one comma-joined request", async () => {
        const seen: string[] = [];
        server.use(
            http.get(`${BASE}/profiles/bots`, ({ request }) => {
                seen.push(
                    new URL(request.url).searchParams.get("categories") ?? "",
                );
                return HttpResponse.json({ data: [] });
            }),
        );

        const { result } = renderHook(() =>
            useOnboardingSuggestions(["BACKEND", "AI"]),
        );
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(seen).toEqual(["BACKEND,AI"]);
    });

    // No `categories` is a different request from an empty one: it means every
    // categorised bot, which is the right answer for a user who reached step
    // two without a field.
    it("omits the parameter entirely when no field was picked", async () => {
        let hadCategories = true;
        server.use(
            http.get(`${BASE}/profiles/bots`, ({ request }) => {
                hadCategories = new URL(request.url).searchParams.has(
                    "categories",
                );
                return HttpResponse.json({ data: [] });
            }),
        );

        const { result } = renderHook(() => useOnboardingSuggestions([]));
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(hadCategories).toBe(false);
    });

    it("asks for a full page at the endpoint's ceiling", async () => {
        let limit = "";
        server.use(
            http.get(`${BASE}/profiles/bots`, ({ request }) => {
                limit = new URL(request.url).searchParams.get("limit") ?? "";
                return HttpResponse.json({ data: [] });
            }),
        );

        const { result } = renderHook(() =>
            useOnboardingSuggestions(["BACKEND"]),
        );
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(limit).toBe("50");
    });

    it("reports no more pages when the first one is short", async () => {
        serveBots([bot("a"), bot("b")]);

        const { result } = renderHook(() =>
            useOnboardingSuggestions(["BACKEND"]),
        );
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.hasMore).toBe(false);
    });

    it("appends the next page on demand and stops when it runs out", async () => {
        const all = Array.from({ length: BOT_PAGE_SIZE + 3 }, (_, i) =>
            bot(`bot-${i}`),
        );
        serveBots(all);

        const { result } = renderHook(() =>
            useOnboardingSuggestions(["BACKEND"]),
        );
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.accounts).toHaveLength(BOT_PAGE_SIZE);
        expect(result.current.hasMore).toBe(true);

        await act(async () => {
            result.current.loadMore();
        });
        await waitFor(() => expect(result.current.isLoadingMore).toBe(false));

        expect(result.current.accounts).toHaveLength(BOT_PAGE_SIZE + 3);
        expect(result.current.hasMore).toBe(false);
    });

    // Following a bot raises its follower count, which is the ranking key, so
    // a bot can slide across the page boundary mid-flow and arrive twice.
    it("does not list a bot the previous page already held", async () => {
        const firstPage = Array.from({ length: BOT_PAGE_SIZE }, (_, i) =>
            bot(`bot-${i}`),
        );
        let call = 0;
        server.use(
            http.get(`${BASE}/profiles/bots`, () => {
                call += 1;
                return HttpResponse.json({
                    data: call === 1 ? firstPage : [bot("bot-0"), bot("fresh")],
                });
            }),
        );

        const { result } = renderHook(() =>
            useOnboardingSuggestions(["BACKEND"]),
        );
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            result.current.loadMore();
        });
        await waitFor(() => expect(result.current.isLoadingMore).toBe(false));

        const ids = result.current.accounts.map((a) => a.userId);
        expect(ids.filter((id) => id === "bot-0")).toHaveLength(1);
        expect(ids).toContain("fresh");
    });

    // The list already on screen may hold bots the user has followed; throwing
    // it away to report a failed second page is the wrong trade.
    it("keeps the loaded bots and toasts when a further page fails", async () => {
        const firstPage = Array.from({ length: BOT_PAGE_SIZE }, (_, i) =>
            bot(`bot-${i}`),
        );
        let call = 0;
        server.use(
            http.get(`${BASE}/profiles/bots`, () => {
                call += 1;
                if (call === 1) return HttpResponse.json({ data: firstPage });
                return HttpResponse.json(
                    {
                        type: "about:blank",
                        title: "TooManyRequests",
                        status: 429,
                        detail: "Too many requests, please try again later.",
                    },
                    { status: 429 },
                );
            }),
        );

        const { result } = renderHook(() =>
            useOnboardingSuggestions(["BACKEND"]),
        );
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            result.current.loadMore();
        });
        await waitFor(() => expect(result.current.isLoadingMore).toBe(false));

        expect(result.current.accounts).toHaveLength(BOT_PAGE_SIZE);
        expect(result.current.error).toBeNull();
        await waitFor(() =>
            expect(useToastStore.getState().toasts).toHaveLength(1),
        );
        expect(useToastStore.getState().toasts[0]).toMatchObject({
            type: "error",
            message: "Too many requests, please try again later.",
        });
    });

    it("reports the server's reason when the first page fails", async () => {
        server.use(
            http.get(`${BASE}/profiles/bots`, () =>
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

        const { result } = renderHook(() =>
            useOnboardingSuggestions(["BACKEND"]),
        );
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.error).toBe(
            "Too many requests, please try again later.",
        );
        expect(result.current.accounts).toEqual([]);
        expect(result.current.hasMore).toBe(false);
    });

    it("clears the error and reloads on retry", async () => {
        let call = 0;
        server.use(
            http.get(`${BASE}/profiles/bots`, () => {
                call += 1;
                if (call === 1) return HttpResponse.error();
                return HttpResponse.json({ data: [bot("typescript")] });
            }),
        );

        const { result } = renderHook(() =>
            useOnboardingSuggestions(["BACKEND"]),
        );
        await waitFor(() => expect(result.current.error).not.toBeNull());

        await act(async () => {
            await result.current.retry();
        });

        expect(result.current.error).toBeNull();
        expect(result.current.accounts.map((a) => a.userId)).toEqual([
            "typescript",
        ]);
    });

    it("refetches when the picked fields change", async () => {
        const seen: string[] = [];
        server.use(
            http.get(`${BASE}/profiles/bots`, ({ request }) => {
                const value =
                    new URL(request.url).searchParams.get("categories") ?? "";
                seen.push(value);
                return HttpResponse.json({ data: [bot(value || "none")] });
            }),
        );

        const { result, rerender } = renderHook(
            ({ categories }: { categories: PostCategory[] }) =>
                useOnboardingSuggestions(categories),
            { initialProps: { categories: ["BACKEND"] as PostCategory[] } },
        );
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        rerender({ categories: ["AI"] as PostCategory[] });
        await waitFor(() =>
            expect(result.current.accounts.map((a) => a.userId)).toEqual([
                "AI",
            ]),
        );

        expect(seen).toEqual(["BACKEND", "AI"]);
    });

    // The array identity changes on every render of the caller; keying off it
    // would refetch on every keystroke elsewhere on the page.
    it("does not refetch when the same fields arrive in a new array", async () => {
        let calls = 0;
        server.use(
            http.get(`${BASE}/profiles/bots`, () => {
                calls += 1;
                return HttpResponse.json({ data: [] });
            }),
        );

        const { result, rerender } = renderHook(
            ({ categories }: { categories: PostCategory[] }) =>
                useOnboardingSuggestions(categories),
            { initialProps: { categories: ["BACKEND"] as PostCategory[] } },
        );
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        rerender({ categories: ["BACKEND"] as PostCategory[] });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(calls).toBe(1);
    });
});
