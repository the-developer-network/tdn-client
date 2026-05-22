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
});

afterEach(() => {
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
});
