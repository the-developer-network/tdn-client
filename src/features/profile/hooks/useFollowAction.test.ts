import { act, renderHook } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../../tests/msw-server";

// useFollowAction → useAuthStore → Zustand persist captures localStorage at
// module-evaluation time. Stub it before any imports are resolved.
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

import { useAuthModalStore } from "../../auth/store/auth-modal.store";
import { useAuthStore } from "../../../core/auth/auth.store";
import { useFollowAction } from "./useFollowAction";

const BASE = "http://localhost:8080/api/v1";

const mockUser = { id: "user-1", username: "testuser", isEmailVerified: true };

beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
    useAuthModalStore.getState().reset();
});

describe("useFollowAction", () => {
    it("opens the auth modal and leaves state unchanged when unauthenticated", async () => {
        const { result } = renderHook(() =>
            useFollowAction("user-2", false, 10),
        );

        await act(async () => {
            await result.current.handleFollow();
        });

        expect(useAuthModalStore.getState().isOpen).toBe(true);
        expect(result.current.isFollowing).toBe(false);
        expect(result.current.followersCount).toBe(10);
    });

    it("applies an optimistic follow and increments followersCount on success", async () => {
        useAuthStore.setState({
            user: mockUser,
            token: "tok",
            isAuthenticated: true,
        });

        const { result } = renderHook(() =>
            useFollowAction("user-2", false, 10),
        );

        await act(async () => {
            await result.current.handleFollow();
        });

        expect(result.current.isFollowing).toBe(true);
        expect(result.current.followersCount).toBe(11);
        expect(result.current.isLoading).toBe(false);
    });

    it("applies an optimistic unfollow and decrements followersCount on success", async () => {
        useAuthStore.setState({
            user: mockUser,
            token: "tok",
            isAuthenticated: true,
        });

        const { result } = renderHook(() =>
            useFollowAction("user-2", true, 10),
        );

        await act(async () => {
            await result.current.handleFollow();
        });

        expect(result.current.isFollowing).toBe(false);
        expect(result.current.followersCount).toBe(9);
        expect(result.current.isLoading).toBe(false);
    });

    it("rolls back the optimistic update silently when the follow API fails", async () => {
        useAuthStore.setState({
            user: mockUser,
            token: "tok",
            isAuthenticated: true,
        });
        server.use(http.post(`${BASE}/follows`, () => HttpResponse.error()));

        const { result } = renderHook(() =>
            useFollowAction("user-2", false, 10),
        );

        await act(async () => {
            await result.current.handleFollow();
        });

        expect(result.current.isFollowing).toBe(false);
        expect(result.current.followersCount).toBe(10);
        expect(result.current.isLoading).toBe(false);
    });

    it("syncs isFollowing with the updated initialIsFollowing prop", () => {
        const { result, rerender } = renderHook(
            ({ initialIsFollowing }: { initialIsFollowing: boolean }) =>
                useFollowAction("user-2", initialIsFollowing, 10),
            { initialProps: { initialIsFollowing: false } },
        );

        expect(result.current.isFollowing).toBe(false);

        rerender({ initialIsFollowing: true });

        expect(result.current.isFollowing).toBe(true);
    });
});
