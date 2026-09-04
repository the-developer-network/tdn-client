import { act, renderHook } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../../tests/msw-server";

// usePostActions → useAuthStore → auth.store.ts uses Zustand persist, which
// captures the localStorage reference at module evaluation time. vi.hoisted
// ensures our Map-backed stub is in place before any module is loaded.
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
import { useFeedSnapshotStore } from "../store/feed-snapshot.store";
import type { Post } from "../api/feed.types";
import { usePostActions } from "./usePostActions";

const BASE = "http://localhost:8080/api/v1";

const mockUser = { id: "user-1", username: "testuser", isEmailVerified: true };

// Minimal synthetic event object — the hook only calls e.stopPropagation()
const mockEvent = { stopPropagation: vi.fn() } as unknown as React.MouseEvent;

beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
    useAuthModalStore.getState().reset();
    useToastStore.setState({ toasts: [] });
    useFeedSnapshotStore.setState({ key: null, snapshot: null });
});

afterEach(() => {
    // jsdom implements neither API, so both are installed by hand below and
    // must be removed again — a global left behind here leaks into every
    // later spec file in the run.
    Reflect.deleteProperty(navigator, "clipboard");
    Reflect.deleteProperty(navigator, "share");
    Reflect.deleteProperty(navigator, "canShare");
    vi.restoreAllMocks();
});

describe("usePostActions", () => {
    describe("handleLike", () => {
        it("opens the auth modal and leaves state unchanged when the user is not authenticated", async () => {
            const { result } = renderHook(() =>
                usePostActions(false, 5, false, "post-1"),
            );

            await act(async () => {
                await result.current.handleLike(mockEvent);
            });

            // openModal() is called without a step argument — defaults to "initial"
            expect(useAuthModalStore.getState().isOpen).toBe(true);
            // No optimistic update should have occurred
            expect(result.current.isLiked).toBe(false);
            expect(result.current.likeCount).toBe(5);
        });

        it("applies an optimistic like and increments likeCount on a successful API call", async () => {
            useAuthStore.setState({
                user: mockUser,
                token: "tok",
                isAuthenticated: true,
            });

            const { result } = renderHook(() =>
                usePostActions(false, 5, false, "post-1"),
            );

            await act(async () => {
                await result.current.handleLike(mockEvent);
            });

            expect(result.current.isLiked).toBe(true);
            expect(result.current.likeCount).toBe(6);
        });

        it("rolls back the optimistic like and shows an error toast when the API fails", async () => {
            useAuthStore.setState({
                user: mockUser,
                token: "tok",
                isAuthenticated: true,
            });
            server.use(
                http.post(`${BASE}/posts/post-1/like`, () =>
                    HttpResponse.error(),
                ),
            );

            const { result } = renderHook(() =>
                usePostActions(false, 5, false, "post-1"),
            );

            await act(async () => {
                await result.current.handleLike(mockEvent);
            });

            expect(result.current.isLiked).toBe(false);
            expect(result.current.likeCount).toBe(5);
            const toasts = useToastStore.getState().toasts;
            expect(toasts).toHaveLength(1);
            expect(toasts[0].type).toBe("error");
        });

        it("applies an optimistic unlike and decrements likeCount when the post was already liked", async () => {
            useAuthStore.setState({
                user: mockUser,
                token: "tok",
                isAuthenticated: true,
            });

            const { result } = renderHook(() =>
                usePostActions(true, 5, false, "post-1"),
            );

            await act(async () => {
                await result.current.handleLike(mockEvent);
            });

            expect(result.current.isLiked).toBe(false);
            expect(result.current.likeCount).toBe(4);
        });
    });

    describe("handleBookmark", () => {
        it("opens the auth modal and leaves state unchanged when the user is not authenticated", async () => {
            const { result } = renderHook(() =>
                usePostActions(false, 0, false, "post-1"),
            );

            await act(async () => {
                await result.current.handleBookmark(mockEvent);
            });

            expect(useAuthModalStore.getState().isOpen).toBe(true);
            expect(result.current.isBookmarked).toBe(false);
        });

        it("sets isBookmarked to true on a successful save", async () => {
            useAuthStore.setState({
                user: mockUser,
                token: "tok",
                isAuthenticated: true,
            });

            const { result } = renderHook(() =>
                usePostActions(false, 0, false, "post-1"),
            );

            await act(async () => {
                await result.current.handleBookmark(mockEvent);
            });

            expect(result.current.isBookmarked).toBe(true);
        });

        it("rolls back isBookmarked and shows an error toast when the save API fails", async () => {
            useAuthStore.setState({
                user: mockUser,
                token: "tok",
                isAuthenticated: true,
            });
            server.use(
                http.post(`${BASE}/posts/post-1/save`, () =>
                    HttpResponse.error(),
                ),
            );

            const { result } = renderHook(() =>
                usePostActions(false, 0, false, "post-1"),
            );

            await act(async () => {
                await result.current.handleBookmark(mockEvent);
            });

            expect(result.current.isBookmarked).toBe(false);
            const toasts = useToastStore.getState().toasts;
            expect(toasts).toHaveLength(1);
            expect(toasts[0].type).toBe("error");
        });
    });

    describe("handleDelete", () => {
        it("calls onDeleteSuccess and returns true when the API succeeds", async () => {
            useAuthStore.setState({
                user: mockUser,
                token: "tok",
                isAuthenticated: true,
            });
            const onDeleteSuccess = vi.fn();

            const { result } = renderHook(() =>
                usePostActions(
                    false,
                    0,
                    false,
                    "post-1",
                    undefined,
                    onDeleteSuccess,
                ),
            );

            let returned: boolean | undefined;
            await act(async () => {
                returned = await result.current.handleDelete();
            });

            expect(returned).toBe(true);
            expect(onDeleteSuccess).toHaveBeenCalledOnce();
        });

        it("opens the auth modal and returns false when the user is not authenticated", async () => {
            const { result } = renderHook(() =>
                usePostActions(false, 0, false, "post-1"),
            );

            let returned: boolean | undefined;
            await act(async () => {
                returned = await result.current.handleDelete();
            });

            expect(returned).toBe(false);
            expect(useAuthModalStore.getState().isOpen).toBe(true);
        });
    });

    describe("handleShare", () => {
        it("copies the post's own URL and confirms it with a toast", async () => {
            Object.defineProperty(navigator, "clipboard", {
                configurable: true,
                value: { writeText: vi.fn(() => Promise.resolve()) },
            });

            const { result } = renderHook(() =>
                usePostActions(false, 0, false, "post-1"),
            );

            await act(async () => {
                await result.current.handleShare(mockEvent);
            });

            expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
                `${window.location.origin}/post/post-1`,
            );
            const toasts = useToastStore.getState().toasts;
            expect(toasts).toHaveLength(1);
            expect(toasts[0].type).toBe("info");
        });

        it("reports a copy that failed instead of doing nothing", async () => {
            vi.spyOn(console, "error").mockImplementation(() => {});
            // Rejects exactly as a browser does when the document is not
            // focused, or when the page is served over an insecure origin.
            Object.defineProperty(navigator, "clipboard", {
                configurable: true,
                value: {
                    writeText: vi.fn(() =>
                        Promise.reject(
                            new DOMException(
                                "Document is not focused.",
                                "NotAllowedError",
                            ),
                        ),
                    ),
                },
            });

            const { result } = renderHook(() =>
                usePostActions(false, 0, false, "post-1"),
            );

            await act(async () => {
                await result.current.handleShare(mockEvent);
            });

            const toasts = useToastStore.getState().toasts;
            expect(toasts).toHaveLength(1);
            expect(toasts[0].type).toBe("error");
        });

        it("stays silent when the reader dismisses the native share sheet", async () => {
            Object.defineProperty(navigator, "share", {
                configurable: true,
                value: vi.fn(() =>
                    Promise.reject(new DOMException("Aborted.", "AbortError")),
                ),
            });
            Object.defineProperty(navigator, "canShare", {
                configurable: true,
                value: vi.fn(() => true),
            });

            const { result } = renderHook(() =>
                usePostActions(false, 0, false, "post-1"),
            );

            await act(async () => {
                await result.current.handleShare(mockEvent);
            });

            expect(useToastStore.getState().toasts).toHaveLength(0);
        });
    });

    describe("the feed snapshot", () => {
        const snapshotPost: Post = {
            mentions: [],
            isSensitive: false,
            mediaPending: false,
            id: "post-1",
            content: "hello",
            type: "COMMUNITY",
            mediaUrls: [],
            createdAt: "2026-08-30T00:00:00.000Z",
            likeCount: 5,
            commentCount: 0,
            isLiked: false,
            isBookmarked: false,
            quoteCount: 0,
            quotedPost: null,
            author: {
                id: "user-2",
                username: "bob",
                avatarUrl: "",
            },
        };

        function seedSnapshot(posts: Post[]) {
            useFeedSnapshotStore.getState().save("entry-1", {
                posts,
                postPage: 1,
                postsHaveMore: true,
                articles: [],
                articlePage: 1,
                articlesHaveMore: false,
                scrollY: 0,
            });
        }

        function storedPost() {
            return useFeedSnapshotStore.getState().snapshot?.posts[0];
        }

        beforeEach(() => {
            useAuthStore.setState({
                user: mockUser,
                token: "tok",
                isAuthenticated: true,
            });
        });

        it("writes a like made on the post page back into the feed left behind", async () => {
            seedSnapshot([snapshotPost]);

            const { result } = renderHook(() =>
                usePostActions(false, 5, false, "post-1"),
            );
            await act(async () => {
                await result.current.handleLike(mockEvent);
            });

            // Coming back no longer refetches, so the stored list is the only
            // thing standing between the reader and a stale like button.
            expect(storedPost()?.isLiked).toBe(true);
            expect(storedPost()?.likeCount).toBe(6);
        });

        it("takes the like back out again when the request fails", async () => {
            seedSnapshot([snapshotPost]);
            server.use(
                http.post(`${BASE}/posts/post-1/like`, () =>
                    HttpResponse.error(),
                ),
            );

            const { result } = renderHook(() =>
                usePostActions(false, 5, false, "post-1"),
            );
            await act(async () => {
                await result.current.handleLike(mockEvent);
            });

            expect(storedPost()?.isLiked).toBe(false);
            expect(storedPost()?.likeCount).toBe(5);
        });

        it("moves the quote badge and writes it back after a quote is created", () => {
            seedSnapshot([{ ...snapshotPost, quoteCount: 2 }]);

            const { result } = renderHook(() =>
                usePostActions(
                    false,
                    5,
                    false,
                    "post-1",
                    undefined,
                    undefined,
                    2,
                ),
            );

            act(() => result.current.registerQuote());

            expect(result.current.quoteCount).toBe(3);
            expect(storedPost()?.quoteCount).toBe(3);
        });

        it("writes a bookmark back too", async () => {
            seedSnapshot([snapshotPost]);

            const { result } = renderHook(() =>
                usePostActions(false, 5, false, "post-1"),
            );
            await act(async () => {
                await result.current.handleBookmark(mockEvent);
            });

            expect(storedPost()?.isBookmarked).toBe(true);
        });

        it("leaves a snapshot that does not hold the post untouched", async () => {
            const other = { ...snapshotPost, id: "post-9" };
            seedSnapshot([other]);

            const { result } = renderHook(() =>
                usePostActions(false, 5, false, "post-1"),
            );
            await act(async () => {
                await result.current.handleLike(mockEvent);
            });

            // Same object, not a rebuilt copy: a like on a post the feed never
            // showed must not churn the stored list.
            expect(storedPost()).toBe(other);
        });

        it("does nothing when there is no snapshot to write into", async () => {
            const { result } = renderHook(() =>
                usePostActions(false, 5, false, "post-1"),
            );
            await act(async () => {
                await result.current.handleLike(mockEvent);
            });

            expect(useFeedSnapshotStore.getState().snapshot).toBeNull();
            expect(result.current.isLiked).toBe(true);
        });
    });
});
