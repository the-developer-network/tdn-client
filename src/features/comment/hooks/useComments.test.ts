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
};

beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
});

describe("useComments", () => {
    it("starts with an empty list, no loading state, and no error", () => {
        const { result } = renderHook(() => useComments("post-1"));

        expect(result.current.comments).toEqual([]);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it("fetchComments() populates the list from the API", async () => {
        const { result } = renderHook(() => useComments("post-1"));

        await act(async () => {
            await result.current.fetchComments();
        });

        expect(result.current.comments).toHaveLength(1);
        expect(result.current.comments[0].id).toBe("comment-1");
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it("fetchComments() sets an error message when the API fails", async () => {
        server.use(
            http.get(`${BASE}/posts/post-1/comments`, () =>
                HttpResponse.error(),
            ),
        );

        const { result } = renderHook(() => useComments("post-1"));

        await act(async () => {
            await result.current.fetchComments();
        });

        expect(result.current.error).toBe("Comments could not be loaded.");
        expect(result.current.comments).toHaveLength(0);
    });

    it("addComment() prepends the new comment to the list without an API call", () => {
        const { result } = renderHook(() => useComments("post-1"));

        act(() => {
            result.current.addComment(mockComment);
        });

        expect(result.current.comments).toHaveLength(1);
        expect(result.current.comments[0].id).toBe("comment-1");
    });

    it("removeComment() removes the comment with the given id from the list", () => {
        const { result } = renderHook(() => useComments("post-1"));

        act(() => {
            result.current.addComment(mockComment);
        });
        act(() => {
            result.current.removeComment("comment-1");
        });

        expect(result.current.comments).toHaveLength(0);
    });
});
