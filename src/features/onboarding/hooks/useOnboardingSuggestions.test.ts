import { renderHook, waitFor } from "@testing-library/react";
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
import { useOnboardingSuggestions } from "./useOnboardingSuggestions";

const BASE = "http://localhost:8080/api/v1";

function author(id: string, username = id) {
    return {
        id,
        username,
        fullName: `${username} name`,
        avatarUrl: "https://example.com/a.png",
    };
}

function post(id: string, authorId: string) {
    return {
        id,
        content: "hello",
        type: "COMMUNITY",
        mediaUrls: [],
        createdAt: new Date().toISOString(),
        likeCount: 0,
        commentCount: 0,
        isLiked: false,
        isBookmarked: false,
        author: author(authorId),
        tags: [],
    };
}

function article(id: string, authorId: string) {
    return {
        id,
        slug: `slug-${id}`,
        title: "An article",
        excerpt: "",
        coverImageUrl: null,
        coverImageAlt: null,
        readingTimeMinutes: 3,
        likeCount: 0,
        commentCount: 0,
        isLiked: false,
        isBookmarked: false,
        status: "PUBLISHED",
        publishedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        author: author(authorId),
        tags: [],
        categories: [],
    };
}

function suggested(id: string) {
    return {
        userId: id,
        username: id,
        fullName: `${id} name`,
        avatarUrl: "https://example.com/a.png",
        bannerUrl: "https://example.com/b.png",
        bio: "a bio",
        followersCount: 42,
        isFollowing: false,
        isMe: false,
    };
}

/** Serves the two content endpoints and, optionally, the popularity fallback. */
function serve({
    posts = [],
    articles = [],
    suggestions = [],
}: {
    posts?: ReturnType<typeof post>[];
    articles?: ReturnType<typeof article>[];
    suggestions?: ReturnType<typeof suggested>[];
}) {
    server.use(
        http.get(`${BASE}/posts`, () => HttpResponse.json({ data: posts })),
        http.get(`${BASE}/articles`, () =>
            HttpResponse.json({ data: articles }),
        ),
        http.get(`${BASE}/profiles/suggestions`, () =>
            HttpResponse.json({ data: suggestions }),
        ),
    );
}

beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState(useAuthStore.getInitialState());
});

describe("useOnboardingSuggestions", () => {
    it("collects the authors publishing in the chosen fields", async () => {
        serve({ posts: [post("p1", "a1")], articles: [article("r1", "a2")] });

        const { result } = renderHook(() =>
            useOnboardingSuggestions(["BACKEND"]),
        );
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.accounts.map((a) => a.userId)).toEqual([
            "a1",
            "a2",
        ]);
        expect(result.current.error).toBeNull();
    });

    it("counts an author once however many times they appear", async () => {
        serve({
            posts: [post("p1", "a1"), post("p2", "a1"), post("p3", "a2")],
            articles: [article("r1", "a1")],
        });

        const { result } = renderHook(() =>
            useOnboardingSuggestions(["BACKEND"]),
        );
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        const ids = result.current.accounts.map((a) => a.userId);
        expect(ids.filter((id) => id === "a1")).toHaveLength(1);
        expect(result.current.accounts[0]).toMatchObject({
            userId: "a1",
            contentCount: 3,
        });
    });

    it("ranks the most prolific author first", async () => {
        serve({
            posts: [
                post("p1", "quiet"),
                post("p2", "loud"),
                post("p3", "loud"),
            ],
        });

        const { result } = renderHook(() =>
            useOnboardingSuggestions(["BACKEND"]),
        );
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.accounts[0].userId).toBe("loud");
    });

    it("leaves the signed-in account out of its own suggestions", async () => {
        useAuthStore.setState({
            user: { id: "me", username: "me", isEmailVerified: true },
            isAuthenticated: true,
        });
        serve({ posts: [post("p1", "me"), post("p2", "other")] });

        const { result } = renderHook(() =>
            useOnboardingSuggestions(["BACKEND"]),
        );
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.accounts.map((a) => a.userId)).toEqual(["other"]);
    });

    // Nobody has posted in the chosen field yet — without the fallback the
    // list would be empty and the required follows unreachable.
    it("tops the list up with popular profiles when the content is thin", async () => {
        serve({ posts: [post("p1", "a1")], suggestions: [suggested("pop")] });

        const { result } = renderHook(() =>
            useOnboardingSuggestions(["BACKEND"]),
        );
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.accounts.map((a) => a.userId)).toEqual([
            "a1",
            "pop",
        ]);
        expect(result.current.accounts[1]).toMatchObject({
            bio: "a bio",
            followersCount: 42,
            contentCount: 0,
        });
    });

    it("does not list a top-up account that already came from the content", async () => {
        serve({ posts: [post("p1", "a1")], suggestions: [suggested("a1")] });

        const { result } = renderHook(() =>
            useOnboardingSuggestions(["BACKEND"]),
        );
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.accounts).toHaveLength(1);
    });

    // Posts and articles are settled independently: one endpoint failing must
    // not cost the authors the other one returned.
    it("keeps the post authors when the article request fails", async () => {
        server.use(
            http.get(`${BASE}/posts`, () =>
                HttpResponse.json({ data: [post("p1", "a1")] }),
            ),
            http.get(`${BASE}/articles`, () => HttpResponse.error()),
            http.get(`${BASE}/profiles/suggestions`, () =>
                HttpResponse.json({ data: [] }),
            ),
        );

        const { result } = renderHook(() =>
            useOnboardingSuggestions(["BACKEND"]),
        );
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.accounts.map((a) => a.userId)).toEqual(["a1"]);
        expect(result.current.error).toBeNull();
    });

    it("reports the reason when even the fallback fails", async () => {
        server.use(
            http.get(`${BASE}/posts`, () => HttpResponse.error()),
            http.get(`${BASE}/articles`, () => HttpResponse.error()),
            http.get(`${BASE}/profiles/suggestions`, () =>
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
    });

    it("asks the posts endpoint for every field that was picked", async () => {
        const seen: string[] = [];
        server.use(
            http.get(`${BASE}/posts`, ({ request }) => {
                seen.push(
                    ...new URL(request.url).searchParams.getAll("categories"),
                );
                return HttpResponse.json({ data: [] });
            }),
            http.get(`${BASE}/articles`, () => HttpResponse.json({ data: [] })),
            http.get(`${BASE}/profiles/suggestions`, () =>
                HttpResponse.json({ data: [] }),
            ),
        );

        const { result } = renderHook(() =>
            useOnboardingSuggestions(["BACKEND", "AI"]),
        );
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(seen).toEqual(["BACKEND", "AI"]);
    });
});
