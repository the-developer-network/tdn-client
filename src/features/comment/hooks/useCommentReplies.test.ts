import { act, renderHook } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../../tests/msw-server";

// The hook reads useAuthStore, which uses Zustand persist — stub localStorage
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
import { useCommentReplies } from "./useCommentReplies";

const BASE = "http://localhost:8080/api/v1";

const mockReply: Comment = {
    id: "reply-1",
    content: "Agreed.",
    mediaUrls: [],
    createdAt: new Date().toISOString(),
    likeCount: 0,
    replyCount: 0,
    isLiked: false,
    isBookmarked: false,
    author: {
        id: "user-2",
        username: "replier",
        fullName: "Reply User",
        avatarUrl: "https://example.com/avatar.png",
    },
    parentId: "comment-1",
    postId: "post-1",
};

/** Serves `total` replies, honouring `page`/`limit`. */
function serveReplies(total: number) {
    const all = Array.from({ length: total }, (_, i) => ({
        ...mockReply,
        id: `reply-${i}`,
    }));

    server.use(
        http.get(`${BASE}/comments/comment-1/replies`, ({ request }) => {
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

beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
});

describe("useCommentReplies", () => {
    it("fetchReplies() populates the list from the API", async () => {
        serveReplies(2);

        const { result } = renderHook(() => useCommentReplies("comment-1"));
        await act(async () => {
            await result.current.fetchReplies();
        });

        expect(result.current.replies).toHaveLength(2);
        expect(result.current.error).toBeNull();
        expect(result.current.isLoading).toBe(false);
    });

    // `/comments/:commentId/replies` pages by `page`/`limit` (max 50). The
    // hook asked for page one and nothing offered a way to ask again.
    describe("pagination", () => {
        it("reaches the replies past the first page", async () => {
            serveReplies(27);

            const { result } = renderHook(() => useCommentReplies("comment-1"));
            await act(async () => {
                await result.current.fetchReplies();
            });

            expect(result.current.replies).toHaveLength(20);
            expect(result.current.hasMore).toBe(true);

            await act(async () => {
                await result.current.loadMore();
            });

            expect(result.current.replies).toHaveLength(27);
            expect(result.current.hasMore).toBe(false);
        });

        it("reports no more to load when the first page is short", async () => {
            serveReplies(3);

            const { result } = renderHook(() => useCommentReplies("comment-1"));
            await act(async () => {
                await result.current.fetchReplies();
            });

            expect(result.current.replies).toHaveLength(3);
            expect(result.current.hasMore).toBe(false);
        });

        it("does not duplicate a reply posted before loading more", async () => {
            serveReplies(27);

            const { result } = renderHook(() => useCommentReplies("comment-1"));
            await act(async () => {
                await result.current.fetchReplies();
            });

            act(() => {
                result.current.addReply({ ...mockReply, id: "brand-new" });
            });
            await act(async () => {
                await result.current.loadMore();
            });

            const ids = result.current.replies.map((r) => r.id);
            expect(new Set(ids).size).toBe(ids.length);
        });

        it("starts again from page one on a re-fetch", async () => {
            serveReplies(27);

            const { result } = renderHook(() => useCommentReplies("comment-1"));
            await act(async () => {
                await result.current.fetchReplies();
            });
            await act(async () => {
                await result.current.loadMore();
            });
            expect(result.current.replies).toHaveLength(27);

            await act(async () => {
                await result.current.fetchReplies();
            });

            expect(result.current.replies).toHaveLength(20);
            expect(result.current.hasMore).toBe(true);
        });
    });

    it("surfaces the reason a fetch failed", async () => {
        server.use(
            http.get(`${BASE}/comments/comment-1/replies`, () =>
                HttpResponse.json(
                    {
                        type: "about:blank",
                        title: "NotFound",
                        status: 404,
                        detail: "Comment not found.",
                    },
                    { status: 404 },
                ),
            ),
        );

        const { result } = renderHook(() => useCommentReplies("comment-1"));
        await act(async () => {
            await result.current.fetchReplies();
        });

        expect(result.current.error).toBe("Comment not found.");
        expect(result.current.isLoading).toBe(false);
    });

    it("removeReply() drops the reply from local state without an API call", async () => {
        serveReplies(2);

        const { result } = renderHook(() => useCommentReplies("comment-1"));
        await act(async () => {
            await result.current.fetchReplies();
        });

        act(() => {
            result.current.removeReply("reply-0");
        });

        expect(result.current.replies).toHaveLength(1);
    });
});
