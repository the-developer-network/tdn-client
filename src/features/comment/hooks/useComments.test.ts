import { act, renderHook } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../../tests/msw-server";

// useComments reads useAuthStore which uses Zustand persist — stub localStorage
// before any module is evaluated so persist captures our Map-backed mock.
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
import type { Comment } from "../api/comment.types";
import { useComments } from "./useComments";

const BASE = "http://localhost:8080/api/v1";

const mockComment: Comment = {
    mentions: [],
    isSensitive: false,
    mediaPending: false,
    id: "comment-1",
    content: "Nice post!",
    mediaUrls: [],
    createdAt: new Date().toISOString(),
    likeCount: 0,
    replyCount: 0,
    isLiked: false,
    isBookmarked: false,
    author: {
        id: "user-1",
        username: "testuser",
        fullName: "Test User",
        avatarUrl: "https://example.com/avatar.png",
    },
    parentId: null,
    postId: "post-1",
    articleId: null,
};

beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
});

describe("useComments", () => {
    it("starts with an empty list, no loading state, and no error", () => {
        const { result } = renderHook(() =>
            useComments({ type: "post", id: "post-1" }),
        );

        expect(result.current.comments).toEqual([]);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it("fetchComments() populates the list from the API", async () => {
        const { result } = renderHook(() =>
            useComments({ type: "post", id: "post-1" }),
        );

        await act(async () => {
            await result.current.fetchComments();
        });

        expect(result.current.comments).toHaveLength(1);
        expect(result.current.comments[0].id).toBe("comment-1");
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    // CHANGED EXPECTATION: this asserted the fixed string
    // "Comments could not be loaded." for every failure alike. A dropped
    // connection is now named as one.
    it("fetchComments() names a connection failure", async () => {
        server.use(
            http.get(`${BASE}/posts/post-1/comments`, () =>
                HttpResponse.error(),
            ),
        );

        const { result } = renderHook(() =>
            useComments({ type: "post", id: "post-1" }),
        );

        await act(async () => {
            await result.current.fetchComments();
        });

        expect(result.current.error).toBe(
            "Unable to connect. Please check your internet connection.",
        );
        expect(result.current.comments).toHaveLength(0);
    });

    // `catch {}` did not even bind the error, so the reason the API gave was
    // discarded rather than merely flattened.
    it("reports the reason the API gave", async () => {
        server.use(
            http.get(`${BASE}/posts/post-1/comments`, () =>
                HttpResponse.json(
                    {
                        type: "about:blank",
                        title: "NotFound",
                        status: 404,
                        detail: "Post not found.",
                    },
                    { status: 404 },
                ),
            ),
        );

        const { result } = renderHook(() =>
            useComments({ type: "post", id: "post-1" }),
        );

        await act(async () => {
            await result.current.fetchComments();
        });

        expect(result.current.error).toBe("Post not found.");
    });

    // `/posts/:postId/comments` pages by `page`/`limit` (max 50). The hook
    // asked once and `CommentList` had no way to ask again, so comment 21
    // onwards was unreachable on any post with a real discussion on it.
    describe("pagination", () => {
        /** Serves `total` comments, honouring `page`/`limit`. */
        function serveComments(total: number) {
            const all = Array.from({ length: total }, (_, i) => ({
                ...mockComment,
                id: `comment-${i}`,
            }));

            server.use(
                http.get(`${BASE}/posts/post-1/comments`, ({ request }) => {
                    const q = new URL(request.url).searchParams;
                    const page = Number(q.get("page") ?? 1);
                    const limit = Number(q.get("limit") ?? 20);
                    const start = (page - 1) * limit;
                    return HttpResponse.json({
                        data: all.slice(start, start + limit),
                        meta: { currentPage: page, limit },
                    });
                }),
            );
        }

        it("reaches the comments past the first page", async () => {
            serveComments(31);

            const { result } = renderHook(() =>
                useComments({ type: "post", id: "post-1" }),
            );
            await act(async () => {
                await result.current.fetchComments();
            });

            expect(result.current.comments).toHaveLength(20);
            expect(result.current.hasMore).toBe(true);

            await act(async () => {
                await result.current.loadMore();
            });

            expect(result.current.comments).toHaveLength(31);
            expect(result.current.hasMore).toBe(false);
        });

        it("reports no more to load when the first page is short", async () => {
            serveComments(4);

            const { result } = renderHook(() =>
                useComments({ type: "post", id: "post-1" }),
            );
            await act(async () => {
                await result.current.fetchComments();
            });

            expect(result.current.comments).toHaveLength(4);
            expect(result.current.hasMore).toBe(false);
        });

        // A new comment is prepended locally. Paging by a page counter would
        // then re-request rows the server has already shifted along, showing
        // one comment twice; offsetting by what is on screen would skip one.
        it("does not duplicate a comment posted before loading more", async () => {
            serveComments(31);

            const { result } = renderHook(() =>
                useComments({ type: "post", id: "post-1" }),
            );
            await act(async () => {
                await result.current.fetchComments();
            });

            act(() => {
                result.current.addComment({ ...mockComment, id: "brand-new" });
            });
            await act(async () => {
                await result.current.loadMore();
            });

            const ids = result.current.comments.map((c) => c.id);
            expect(new Set(ids).size).toBe(ids.length);
        });
    });

    it("addComment() prepends the new comment to the list without an API call", () => {
        const { result } = renderHook(() =>
            useComments({ type: "post", id: "post-1" }),
        );

        act(() => {
            result.current.addComment(mockComment);
        });

        expect(result.current.comments).toHaveLength(1);
        expect(result.current.comments[0].id).toBe("comment-1");
    });

    it("removeComment() removes the comment with the given id from the list", () => {
        const { result } = renderHook(() =>
            useComments({ type: "post", id: "post-1" }),
        );

        act(() => {
            result.current.addComment(mockComment);
        });
        act(() => {
            result.current.removeComment("comment-1");
        });

        expect(result.current.comments).toHaveLength(0);
    });
});
