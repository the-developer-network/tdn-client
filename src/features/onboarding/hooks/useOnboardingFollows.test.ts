import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../../tests/msw-server";

// apiClient reads localStorage on every request; jsdom 29's Storage.clear()
// is broken, so stub it before any module is loaded.
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

import { useToastStore } from "../../../shared/store/toast.store";
import { useOnboardingFollows } from "./useOnboardingFollows";

const BASE = "http://localhost:8080/api/v1";

beforeEach(() => {
    localStorage.clear();
    useToastStore.setState({ toasts: [] });
});

describe("useOnboardingFollows", () => {
    it("starts with nobody followed", () => {
        const { result } = renderHook(() => useOnboardingFollows());

        expect(result.current.followedCount).toBe(0);
        expect(result.current.followedIds.size).toBe(0);
    });

    it("follows optimistically and counts it", async () => {
        const { result } = renderHook(() => useOnboardingFollows());

        await act(async () => {
            await result.current.toggle("user-2");
        });

        expect(result.current.followedIds.has("user-2")).toBe(true);
        expect(result.current.followedCount).toBe(1);
    });

    it("unfollows on a second toggle", async () => {
        const { result } = renderHook(() => useOnboardingFollows());

        await act(async () => {
            await result.current.toggle("user-2");
        });
        await act(async () => {
            await result.current.toggle("user-2");
        });

        expect(result.current.followedIds.has("user-2")).toBe(false);
        expect(result.current.followedCount).toBe(0);
    });

    // The counter is the flow's only gate, so a follow the server refused must
    // not leave a phantom entry pushing the user past the requirement.
    it("rolls the count back and toasts when the follow fails", async () => {
        server.use(
            http.post(`${BASE}/follows`, () =>
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

        const { result } = renderHook(() => useOnboardingFollows());

        await act(async () => {
            await result.current.toggle("user-2");
        });

        expect(result.current.followedCount).toBe(0);
        await waitFor(() =>
            expect(useToastStore.getState().toasts).toHaveLength(1),
        );
        expect(useToastStore.getState().toasts[0]).toMatchObject({
            type: "error",
            message: "Too many requests, please try again later.",
        });
    });

    it("restores the follow when an unfollow fails", async () => {
        const { result } = renderHook(() => useOnboardingFollows());

        await act(async () => {
            await result.current.toggle("user-2");
        });

        server.use(http.delete(`${BASE}/follows`, () => HttpResponse.error()));

        await act(async () => {
            await result.current.toggle("user-2");
        });

        expect(result.current.followedIds.has("user-2")).toBe(true);
        expect(result.current.followedCount).toBe(1);
    });

    it("tracks which account is mid-request", async () => {
        let release: (() => void) | undefined;
        server.use(
            http.post(`${BASE}/follows`, async () => {
                await new Promise<void>((resolve) => {
                    release = resolve;
                });
                return new HttpResponse(null, { status: 204 });
            }),
        );

        const { result } = renderHook(() => useOnboardingFollows());

        let pending: Promise<void>;
        act(() => {
            pending = result.current.toggle("user-2");
        });

        await waitFor(() =>
            expect(result.current.isPending("user-2")).toBe(true),
        );
        expect(result.current.isPending("user-3")).toBe(false);

        await act(async () => {
            release?.();
            await pending;
        });

        expect(result.current.isPending("user-2")).toBe(false);
    });
});
