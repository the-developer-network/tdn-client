import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../../tests/msw-server";

// The hook reaches `apiClient`, which reads `localStorage` on every request.
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

import { useFollowList } from "./useFollowList";

const BASE = "http://localhost:8080/api/v1";

/**
 * Serves a follower list of `total` users, honouring `limit`/`offset` the way
 * the API does — which is the only way the truncation becomes visible.
 */
function serveFollowers(total: number) {
    const all = Array.from({ length: total }, (_, i) => ({
        userId: `u${i}`,
        username: `follower${i}`,
        fullName: `Follower ${i}`,
        avatarUrl: "",
        bio: null,
        isFollowing: false,
        isMe: false,
    }));

    server.use(
        http.get(`${BASE}/profiles/:username/followers`, ({ request }) => {
            const q = new URL(request.url).searchParams;
            const limit = Number(q.get("limit") ?? 20);
            const offset = Number(q.get("offset") ?? 0);
            const page = all.slice(offset, offset + limit);
            return HttpResponse.json({
                data: page,
                meta: { limit, offset, count: all.length },
            });
        }),
    );
}

beforeEach(() => {
    localStorage.clear();
});

describe("useFollowList", () => {
    // The modal scrolls but never asks for more, and the request carried no
    // pagination, so the server's default of 20 was the whole list. An
    // account with 34 followers showed 20 of them and no way to reach the rest.
    it("reaches the followers past the first page", async () => {
        serveFollowers(34);

        const { result } = renderHook(() =>
            useFollowList("alice", "followers", true),
        );

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.users).toHaveLength(20);
        expect(result.current.hasMore).toBe(true);

        await act(async () => {
            result.current.loadMore();
        });

        await waitFor(() => expect(result.current.users).toHaveLength(34));
        expect(result.current.hasMore).toBe(false);
    });

    it("reports no more to load when the first page is not full", async () => {
        serveFollowers(5);

        const { result } = renderHook(() =>
            useFollowList("alice", "followers", true),
        );

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.users).toHaveLength(5);
        expect(result.current.hasMore).toBe(false);
    });

    // Switching tabs inside the open modal must not staple the following
    // list onto the followers already on screen.
    it("starts over when the list type changes", async () => {
        serveFollowers(34);
        server.use(
            http.get(`${BASE}/profiles/:username/following`, () =>
                HttpResponse.json({
                    data: [{ userId: "x", username: "carol" }],
                    meta: { limit: 20, offset: 0, count: 1 },
                }),
            ),
        );

        const { result, rerender } = renderHook(
            ({ type }: { type: "followers" | "following" }) =>
                useFollowList("alice", type, true),
            { initialProps: { type: "followers" as const } },
        );

        await waitFor(() => expect(result.current.users).toHaveLength(20));

        rerender({ type: "following" });

        await waitFor(() => expect(result.current.users).toHaveLength(1));
        expect(result.current.users[0].username).toBe("carol");
    });

    it("surfaces a failure and stops loading", async () => {
        server.use(
            http.get(
                `${BASE}/profiles/:username/followers`,
                () =>
                    new HttpResponse(
                        JSON.stringify({
                            status: 404,
                            title: "NotFound",
                            detail: "Profile not found.",
                        }),
                        { status: 404 },
                    ),
            ),
        );

        const { result } = renderHook(() =>
            useFollowList("ghost", "followers", true),
        );

        await waitFor(() =>
            expect(result.current.error).toBe("Profile not found."),
        );
        expect(result.current.isLoading).toBe(false);
    });
});
