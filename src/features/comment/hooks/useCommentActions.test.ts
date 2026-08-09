import { act, renderHook } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../../tests/msw-server";

// useCommentActions → useAuthStore → auth.store.ts uses Zustand persist, which
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
import { useLanguageStore } from "../../../shared/store/language.store";
import { useToastStore } from "../../../shared/store/toast.store";
import { useCommentActions } from "./useCommentActions";

const BASE = "http://localhost:8080/api/v1";

const mockUser = { id: "user-1", username: "testuser", isEmailVerified: true };

// Minimal synthetic event object — the hook only calls e.stopPropagation()
const mockEvent = { stopPropagation: vi.fn() } as unknown as React.MouseEvent;

const signIn = () =>
    useAuthStore.setState({
        user: mockUser,
        token: "tok",
        isAuthenticated: true,
    });

const toasts = () => useToastStore.getState().toasts;

/**
 * jsdom implements neither the Clipboard API nor the Web Share API, so both
 * branches of `shareContent` have to be installed by hand. They are deleted
 * again in `afterEach`: a global left behind here leaks into every later spec
 * file in the run.
 */
function stubClipboard(writeText: () => Promise<void>) {
    Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: vi.fn(writeText) },
    });
}

function stubWebShare(share: () => Promise<void>) {
    Object.defineProperty(navigator, "share", {
        configurable: true,
        value: vi.fn(share),
    });
    Object.defineProperty(navigator, "canShare", {
        configurable: true,
        value: vi.fn(() => true),
    });
}

beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
    useAuthModalStore.getState().reset();
    useToastStore.setState({ toasts: [] });
    // The messages asserted below are the English ones; the locale is
    // otherwise sniffed from navigator.language.
    useLanguageStore.setState({ locale: "en" });
});

afterEach(() => {
    Reflect.deleteProperty(navigator, "clipboard");
    Reflect.deleteProperty(navigator, "share");
    Reflect.deleteProperty(navigator, "canShare");
    vi.restoreAllMocks();
});

describe("useCommentActions", () => {
    describe("handleLike", () => {
        it("opens the auth modal and leaves state unchanged when the user is not authenticated", async () => {
            const { result } = renderHook(() =>
                useCommentActions(false, 5, false, "comment-1"),
            );

            await act(async () => {
                await result.current.handleLike(mockEvent);
            });

            expect(useAuthModalStore.getState().isOpen).toBe(true);
            expect(result.current.isLiked).toBe(false);
            expect(result.current.likeCount).toBe(5);
        });

        it("applies an optimistic like and increments likeCount on a successful API call", async () => {
            signIn();

            const { result } = renderHook(() =>
                useCommentActions(false, 5, false, "comment-1"),
            );

            await act(async () => {
                await result.current.handleLike(mockEvent);
            });

            expect(result.current.isLiked).toBe(true);
            expect(result.current.likeCount).toBe(6);
        });

        it("applies an optimistic unlike and decrements likeCount when the comment was already liked", async () => {
            signIn();

            const { result } = renderHook(() =>
                useCommentActions(true, 5, false, "comment-1"),
            );

            await act(async () => {
                await result.current.handleLike(mockEvent);
            });

            expect(result.current.isLiked).toBe(false);
            expect(result.current.likeCount).toBe(4);
        });

        it("rolls back the optimistic like and shows an error toast when the API fails", async () => {
            signIn();
            server.use(
                http.post(`${BASE}/comments/comment-1/like`, () =>
                    HttpResponse.error(),
                ),
            );

            const { result } = renderHook(() =>
                useCommentActions(false, 5, false, "comment-1"),
            );

            await act(async () => {
                await result.current.handleLike(mockEvent);
            });

            expect(result.current.isLiked).toBe(false);
            expect(result.current.likeCount).toBe(5);
            expect(toasts()).toHaveLength(1);
            expect(toasts()[0].type).toBe("error");
        });
    });

    describe("handleSave", () => {
        it("opens the auth modal and leaves state unchanged when the user is not authenticated", async () => {
            const { result } = renderHook(() =>
                useCommentActions(false, 0, false, "comment-1"),
            );

            await act(async () => {
                await result.current.handleSave(mockEvent);
            });

            expect(useAuthModalStore.getState().isOpen).toBe(true);
            expect(result.current.isBookmarked).toBe(false);
        });

        it("sets isBookmarked on a successful save", async () => {
            signIn();

            const { result } = renderHook(() =>
                useCommentActions(false, 0, false, "comment-1"),
            );

            await act(async () => {
                await result.current.handleSave(mockEvent);
            });

            expect(result.current.isBookmarked).toBe(true);
        });

        it("rolls back isBookmarked and shows an error toast when the save fails", async () => {
            signIn();
            server.use(
                http.post(`${BASE}/comments/comment-1/save`, () =>
                    HttpResponse.error(),
                ),
            );

            const { result } = renderHook(() =>
                useCommentActions(false, 0, false, "comment-1"),
            );

            await act(async () => {
                await result.current.handleSave(mockEvent);
            });

            expect(result.current.isBookmarked).toBe(false);
            expect(toasts()).toHaveLength(1);
            expect(toasts()[0].type).toBe("error");
        });
    });

    describe("handleDelete", () => {
        it("calls onDeleteSuccess and returns true when the API succeeds", async () => {
            signIn();
            const onDeleteSuccess = vi.fn();

            const { result } = renderHook(() =>
                useCommentActions(
                    false,
                    0,
                    false,
                    "comment-1",
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
                useCommentActions(false, 0, false, "comment-1"),
            );

            let returned: boolean | undefined;
            await act(async () => {
                returned = await result.current.handleDelete();
            });

            expect(returned).toBe(false);
            expect(useAuthModalStore.getState().isOpen).toBe(true);
        });

        it("returns false and shows an error toast when the delete fails", async () => {
            signIn();
            const onDeleteSuccess = vi.fn();
            server.use(
                http.delete(`${BASE}/comments/comment-1`, () =>
                    HttpResponse.error(),
                ),
            );

            const { result } = renderHook(() =>
                useCommentActions(
                    false,
                    0,
                    false,
                    "comment-1",
                    onDeleteSuccess,
                ),
            );

            let returned: boolean | undefined;
            await act(async () => {
                returned = await result.current.handleDelete();
            });

            expect(returned).toBe(false);
            expect(onDeleteSuccess).not.toHaveBeenCalled();
            expect(toasts()).toHaveLength(1);
            expect(toasts()[0].type).toBe("error");
        });
    });

    describe("handleShare", () => {
        it("copies the comment's own URL and confirms it with a toast", async () => {
            stubClipboard(() => Promise.resolve());

            const { result } = renderHook(() =>
                useCommentActions(false, 0, false, "comment-1"),
            );

            await act(async () => {
                await result.current.handleShare(mockEvent);
            });

            expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
                `${window.location.origin}/comments/comment-1`,
            );
            expect(toasts()).toHaveLength(1);
            expect(toasts()[0].type).toBe("info");
            expect(toasts()[0].message).toBe("Link copied to clipboard!");
        });

        it("reports a copy that failed instead of doing nothing", async () => {
            vi.spyOn(console, "error").mockImplementation(() => {});
            // Rejects exactly as a browser does when the document is not
            // focused, or when the page is served over an insecure origin.
            stubClipboard(() =>
                Promise.reject(
                    new DOMException(
                        "Document is not focused.",
                        "NotAllowedError",
                    ),
                ),
            );

            const { result } = renderHook(() =>
                useCommentActions(false, 0, false, "comment-1"),
            );

            await act(async () => {
                await result.current.handleShare(mockEvent);
            });

            expect(toasts()).toHaveLength(1);
            expect(toasts()[0].type).toBe("error");
        });

        it("reports a native share that failed", async () => {
            vi.spyOn(console, "error").mockImplementation(() => {});
            stubWebShare(() =>
                Promise.reject(
                    new DOMException("Share failed.", "NotAllowedError"),
                ),
            );

            const { result } = renderHook(() =>
                useCommentActions(false, 0, false, "comment-1"),
            );

            await act(async () => {
                await result.current.handleShare(mockEvent);
            });

            expect(toasts()).toHaveLength(1);
            expect(toasts()[0].type).toBe("error");
        });

        it("stays silent when the reader dismisses the native share sheet", async () => {
            stubWebShare(() =>
                Promise.reject(new DOMException("Aborted.", "AbortError")),
            );

            const { result } = renderHook(() =>
                useCommentActions(false, 0, false, "comment-1"),
            );

            await act(async () => {
                await result.current.handleShare(mockEvent);
            });

            expect(toasts()).toHaveLength(0);
        });

        it("does not toast a copy confirmation when the native sheet handled the share", async () => {
            stubWebShare(() => Promise.resolve());

            const { result } = renderHook(() =>
                useCommentActions(false, 0, false, "comment-1"),
            );

            await act(async () => {
                await result.current.handleShare(mockEvent);
            });

            expect(navigator.share).toHaveBeenCalledWith({
                title: "Comment",
                text: "Check out this comment!",
                url: `${window.location.origin}/comments/comment-1`,
            });
            expect(toasts()).toHaveLength(0);
        });
    });
});
