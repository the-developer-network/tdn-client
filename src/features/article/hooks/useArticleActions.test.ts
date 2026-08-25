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

import { useAuthStore } from "../../../core/auth/auth.store";
import { useAuthModalStore } from "../../auth/store/auth-modal.store";
import { useToastStore } from "../../../shared/store/toast.store";
import { useArticleActions } from "./useArticleActions";

const BASE = "http://localhost:8080/api/v1";

const mouseEvent = () =>
    ({ stopPropagation: vi.fn() }) as unknown as React.MouseEvent;

const renderActions = () =>
    renderHook(() =>
        useArticleActions(
            "article-1",
            "my-article",
            false,
            5,
            false,
            "My Article",
        ),
    );

beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState(useAuthStore.getInitialState());
    useAuthModalStore.setState(useAuthModalStore.getInitialState());
    useToastStore.setState(useToastStore.getInitialState());
});

const signIn = () => {
    useAuthStore.setState({ isAuthenticated: true });
};

describe("useArticleActions", () => {
    it("opens the auth modal instead of liking when signed out", async () => {
        const { result } = renderActions();

        await act(async () => {
            await result.current.handleLike(mouseEvent());
        });

        expect(useAuthModalStore.getState().isOpen).toBe(true);
        expect(result.current.isLiked).toBe(false);
        expect(result.current.likeCount).toBe(5);
    });

    // The endpoints answer `{ meta }` alone — no updated counter comes back —
    // so the count on screen can only be the optimistic one.
    it("applies the like immediately", async () => {
        signIn();
        server.use(
            http.post(
                `${BASE}/articles/:id/like`,
                () => new HttpResponse(null, { status: 204 }),
            ),
        );

        const { result } = renderActions();
        await act(async () => {
            await result.current.handleLike(mouseEvent());
        });

        expect(result.current.isLiked).toBe(true);
        expect(result.current.likeCount).toBe(6);
    });

    it("rolls the like back and toasts when the request fails", async () => {
        signIn();
        server.use(
            http.post(`${BASE}/articles/:id/like`, () =>
                HttpResponse.json(
                    {
                        type: "about:blank",
                        title: "TooManyRequests",
                        status: 429,
                        detail: "Slow down.",
                        instance: "/api/v1/articles/article-1/like",
                    },
                    { status: 429 },
                ),
            ),
        );

        const { result } = renderActions();
        await act(async () => {
            await result.current.handleLike(mouseEvent());
        });

        expect(result.current.isLiked).toBe(false);
        expect(result.current.likeCount).toBe(5);
        await waitFor(() =>
            expect(useToastStore.getState().toasts).toHaveLength(1),
        );
        expect(useToastStore.getState().toasts[0]).toMatchObject({
            type: "error",
            message: "Slow down.",
        });
    });

    it("undoes a like with DELETE on the same path", async () => {
        signIn();
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
        );

        const { result } = renderActions();
        await act(async () => {
            await result.current.handleLike(mouseEvent());
        });
        await act(async () => {
            await result.current.handleLike(mouseEvent());
        });

        expect(result.current.isLiked).toBe(false);
        expect(result.current.likeCount).toBe(5);
        expect(seen).toEqual({
            method: "DELETE",
            path: "/api/v1/articles/article-1/like",
        });
    });

    it("applies the bookmark immediately and rolls it back on failure", async () => {
        signIn();
        server.use(
            http.post(`${BASE}/articles/:id/bookmark`, () =>
                HttpResponse.json(
                    {
                        type: "about:blank",
                        title: "InternalServerError",
                        status: 500,
                        detail: "Nope.",
                        instance: "/api/v1/articles/article-1/bookmark",
                    },
                    { status: 500 },
                ),
            ),
        );

        const { result } = renderActions();
        await act(async () => {
            await result.current.handleBookmark(mouseEvent());
        });

        expect(result.current.isBookmarked).toBe(false);
        await waitFor(() =>
            expect(useToastStore.getState().toasts).toHaveLength(1),
        );
    });

    it("opens the auth modal instead of bookmarking when signed out", async () => {
        const { result } = renderActions();

        await act(async () => {
            await result.current.handleBookmark(mouseEvent());
        });

        expect(useAuthModalStore.getState().isOpen).toBe(true);
        expect(result.current.isBookmarked).toBe(false);
    });

    it("shares the article's own URL, not the current page", async () => {
        // Defined rather than stubbed globally: `vi.unstubAllGlobals` would
        // also drop the hoisted localStorage stub this module graph needs.
        const writeText = vi.fn(() => Promise.resolve());
        Object.defineProperty(navigator, "clipboard", {
            configurable: true,
            value: { writeText },
        });

        const { result } = renderActions();
        await act(async () => {
            await result.current.handleShare(mouseEvent());
        });

        expect(writeText).toHaveBeenCalledWith(
            `${window.location.origin}/articles/my-article`,
        );

        Reflect.deleteProperty(navigator, "clipboard");
    });
});
