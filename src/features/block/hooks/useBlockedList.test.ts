import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../../tests/msw-server";

// useBlockedList → blockApi → apiClient, which reads `localStorage` on every
// call. Stub it before any imports are resolved.
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

import { useBlockedList } from "./useBlockedList";

const BASE = "http://localhost:8080/api/v1";

function row(n: number) {
    return {
        userId: `u-${n}`,
        username: `user${n}`,
        fullName: `User ${n}`,
        avatarUrl: "",
        bio: null,
    };
}

/** Answers every page with `size` rows, recording the offsets asked for. */
function serveRows(size: number) {
    const offsets: string[] = [];
    server.use(
        http.get(`${BASE}/blocks`, ({ request }) => {
            const params = new URL(request.url).searchParams;
            offsets.push(params.get("offset") ?? "");
            const from = Number(params.get("offset") ?? 0);
            return HttpResponse.json({
                data: Array.from({ length: size }, (_, i) => row(from + i)),
            });
        }),
    );
    return offsets;
}

beforeEach(() => {
    localStorage.clear();
});

describe("useBlockedList", () => {
    it("loads the first page and leaves loading behind", async () => {
        serveRows(2);

        const { result } = renderHook(() => useBlockedList());

        expect(result.current.isLoading).toBe(true);

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.users).toHaveLength(2);
        expect(result.current.error).toBeNull();
    });

    // `meta.total` would answer this, but the client unwraps `data` before the
    // hook sees it, so a full page is the only signal there is another behind.
    it("offers another page only when the last one came back full", async () => {
        serveRows(20);
        const { result } = renderHook(() => useBlockedList());
        await waitFor(() => expect(result.current.hasMore).toBe(true));
    });

    it("stops offering pages once one comes back short", async () => {
        serveRows(3);
        const { result } = renderHook(() => useBlockedList());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.hasMore).toBe(false);
    });

    it("asks for the next page from the end of what it holds", async () => {
        const offsets = serveRows(20);

        const { result } = renderHook(() => useBlockedList());
        await waitFor(() => expect(result.current.users).toHaveLength(20));

        act(() => result.current.loadMore());
        await waitFor(() => expect(result.current.users).toHaveLength(40));

        expect(offsets).toEqual(["0", "20"]);
    });

    it("does not fetch until it is enabled", async () => {
        let requested = false;
        server.use(
            http.get(`${BASE}/blocks`, () => {
                requested = true;
                return HttpResponse.json({ data: [] });
            }),
        );

        const { result } = renderHook(() => useBlockedList(false));

        expect(result.current.isLoading).toBe(false);
        expect(requested).toBe(false);
    });

    it("surfaces a failed load and can be retried", async () => {
        let attempt = 0;
        server.use(
            http.get(`${BASE}/blocks`, () => {
                attempt += 1;
                if (attempt === 1) {
                    return HttpResponse.json(
                        {
                            status: 500,
                            title: "InternalServerError",
                            detail: "An unexpected error occurred.",
                        },
                        { status: 500 },
                    );
                }
                return HttpResponse.json({ data: [row(1)] });
            }),
        );

        const { result } = renderHook(() => useBlockedList());

        await waitFor(() => expect(result.current.error).not.toBeNull());
        expect(result.current.isLoading).toBe(false);

        act(() => result.current.retry());

        await waitFor(() => expect(result.current.users).toHaveLength(1));
        expect(result.current.error).toBeNull();
    });

    /*
     * The row is the only way back to this account, so it is dropped after an
     * unblock the server confirmed and never before it. Both lists shrink
     * together, which is what keeps `users.length` a correct offset.
     */
    it("drops one row without disturbing the rest", async () => {
        serveRows(3);

        const { result } = renderHook(() => useBlockedList());
        await waitFor(() => expect(result.current.users).toHaveLength(3));

        act(() => result.current.remove("u-1"));

        expect(result.current.users.map((u) => u.userId)).toEqual([
            "u-0",
            "u-2",
        ]);
    });
});
