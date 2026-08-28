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
import type { OnboardingAccount } from "../onboarding.types";

const BASE = "http://localhost:8080/api/v1";

function account(id: string, isFollowing = false): OnboardingAccount {
    return {
        userId: id,
        username: id,
        fullName: `${id} name`,
        avatarUrl: "",
        bio: "",
        followersCount: 1,
        categories: ["BACKEND"],
        isFollowing,
    };
}

beforeEach(() => {
    localStorage.clear();
    useToastStore.setState({ toasts: [] });
});

describe("useOnboardingFollows", () => {
    it("starts with nobody followed", () => {
        const { result } = renderHook(() => useOnboardingFollows([]));

        expect(result.current.followedIds.size).toBe(0);
        expect(result.current.netFollowChange).toBe(0);
    });

    it("follows optimistically and counts it", async () => {
        const { result } = renderHook(() => useOnboardingFollows([]));

        await act(async () => {
            await result.current.toggle("user-2");
        });

        expect(result.current.followedIds.has("user-2")).toBe(true);
        expect(result.current.netFollowChange).toBe(1);
    });

    it("unfollows on a second toggle", async () => {
        const { result } = renderHook(() => useOnboardingFollows([]));

        await act(async () => {
            await result.current.toggle("user-2");
        });
        await act(async () => {
            await result.current.toggle("user-2");
        });

        expect(result.current.followedIds.has("user-2")).toBe(false);
        expect(result.current.netFollowChange).toBe(0);
    });

    // A returning user must not be asked to follow bots they followed on an
    // earlier visit — the endpoint says so in `isFollowing` and the cards have
    // to show it.
    it("marks the bots that arrived already followed", async () => {
        const { result } = renderHook(() =>
            useOnboardingFollows([
                account("followed", true),
                account("stranger"),
            ]),
        );

        await waitFor(() =>
            expect(result.current.followedIds.has("followed")).toBe(true),
        );
        expect(result.current.followedIds.has("stranger")).toBe(false);
    });

    // The profile's `followingCount` already counts those bots, so counting
    // them again here would let a returning user out having followed nobody.
    it("does not count a seeded bot as progress", async () => {
        const { result } = renderHook(() =>
            useOnboardingFollows([account("followed", true)]),
        );

        await waitFor(() =>
            expect(result.current.followedIds.has("followed")).toBe(true),
        );
        expect(result.current.netFollowChange).toBe(0);
        expect(result.current.serverFollowedIds.has("followed")).toBe(true);
    });

    it("counts unfollowing a seeded bot as going backwards", async () => {
        const { result } = renderHook(() =>
            useOnboardingFollows([account("followed", true)]),
        );

        await waitFor(() =>
            expect(result.current.followedIds.has("followed")).toBe(true),
        );

        await act(async () => {
            await result.current.toggle("followed");
        });

        expect(result.current.netFollowChange).toBe(-1);
    });

    // The seeding runs on every change of the list, and a second page changes
    // it. Without a record of what has already been ruled on, that re-seed
    // would quietly restore a bot the user had just unfollowed.
    it("does not re-follow a seeded bot when the next page arrives", async () => {
        const { rerender, result } = renderHook(
            ({ accounts }: { accounts: OnboardingAccount[] }) =>
                useOnboardingFollows(accounts),
            { initialProps: { accounts: [account("followed", true)] } },
        );

        await waitFor(() =>
            expect(result.current.followedIds.has("followed")).toBe(true),
        );

        await act(async () => {
            await result.current.toggle("followed");
        });
        expect(result.current.followedIds.has("followed")).toBe(false);

        rerender({
            accounts: [account("followed", true), account("page-two")],
        });

        await waitFor(() =>
            expect(result.current.followedIds.has("followed")).toBe(false),
        );
        expect(result.current.netFollowChange).toBe(-1);
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

        const { result } = renderHook(() => useOnboardingFollows([]));

        await act(async () => {
            await result.current.toggle("user-2");
        });

        expect(result.current.netFollowChange).toBe(0);
        await waitFor(() =>
            expect(useToastStore.getState().toasts).toHaveLength(1),
        );
        expect(useToastStore.getState().toasts[0]).toMatchObject({
            type: "error",
            message: "Too many requests, please try again later.",
        });
    });

    it("restores the follow when an unfollow fails", async () => {
        const { result } = renderHook(() => useOnboardingFollows([]));

        await act(async () => {
            await result.current.toggle("user-2");
        });

        server.use(http.delete(`${BASE}/follows`, () => HttpResponse.error()));

        await act(async () => {
            await result.current.toggle("user-2");
        });

        expect(result.current.followedIds.has("user-2")).toBe(true);
        expect(result.current.netFollowChange).toBe(1);
    });

    it("sends the account's id, not its username", async () => {
        const bodies: unknown[] = [];
        server.use(
            http.post(`${BASE}/follows`, async ({ request }) => {
                bodies.push(await request.json());
                return HttpResponse.json({ data: { followersCount: 12 } });
            }),
        );

        const { result } = renderHook(() =>
            useOnboardingFollows([account("bot-uuid")]),
        );

        await act(async () => {
            await result.current.toggle("bot-uuid");
        });

        expect(bodies).toEqual([{ targetId: "bot-uuid" }]);
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

        const { result } = renderHook(() => useOnboardingFollows([]));

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

    // Onboarding has a 60/minute follow budget and a user tapping a slow row
    // must not spend it.
    it("ignores a second toggle while the first is in flight", async () => {
        let calls = 0;
        let release: (() => void) | undefined;
        server.use(
            http.post(`${BASE}/follows`, async () => {
                calls += 1;
                await new Promise<void>((resolve) => {
                    release = resolve;
                });
                return new HttpResponse(null, { status: 204 });
            }),
        );

        const { result } = renderHook(() => useOnboardingFollows([]));

        let pending: Promise<void>;
        act(() => {
            pending = result.current.toggle("user-2");
        });
        await waitFor(() =>
            expect(result.current.isPending("user-2")).toBe(true),
        );

        await act(async () => {
            await result.current.toggle("user-2");
        });

        await act(async () => {
            release?.();
            await pending;
        });

        expect(calls).toBe(1);
        expect(result.current.followedIds.has("user-2")).toBe(true);
    });
});
