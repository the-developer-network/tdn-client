import { renderHook, waitFor, act } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { server } from "../../../../tests/msw-server";
import { vi } from "vitest";

// `messageApi` reaches `apiClient`, which reads the token from localStorage as
// it evaluates.
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

import { useConversations } from "./useConversations";
import { useMessageStore } from "../store/message.store";

const BASE = "http://localhost:8080/api/v1";

function row(id: string) {
    return {
        id,
        status: "ACCEPTED",
        isRequest: false,
        canSend: true,
        participant: { id: "u2", username: "ayse", avatarUrl: "" },
        unreadCount: 0,
        lastMessagePreview: null,
        lastMessageAt: null,
        otherLastReadAt: null,
        createdAt: "2026-09-01T00:00:00.000Z",
    };
}

beforeEach(() => {
    useMessageStore.setState(useMessageStore.getInitialState());
});

describe("useConversations", () => {
    it("loads the first page on mount and keeps the cursor", async () => {
        server.use(
            http.get(`${BASE}/conversations`, () =>
                HttpResponse.json({
                    data: [row("c1")],
                    meta: { timestamp: "t", nextCursor: "page-2" },
                }),
            ),
        );

        const { result } = renderHook(() => useConversations("ACCEPTED"));

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(useMessageStore.getState().conversations).toHaveLength(1);
        expect(result.current.hasMore).toBe(true);
    });

    /*
     * The cursor is opaque: whatever the server wrote is what goes back, with
     * no parsing and nothing constructed. Sending one the client invented is
     * how "an undecodable cursor returns the first page" stops being harmless.
     */
    it("echoes the cursor back verbatim on the next page", async () => {
        const seen: (string | null)[] = [];
        server.use(
            http.get(`${BASE}/conversations`, ({ request }) => {
                const cursor = new URL(request.url).searchParams.get("cursor");
                seen.push(cursor);
                return HttpResponse.json({
                    data: [row(cursor ? "c2" : "c1")],
                    meta: {
                        timestamp: "t",
                        nextCursor: cursor ? null : "opaque::1",
                    },
                });
            }),
        );

        const { result } = renderHook(() => useConversations("ACCEPTED"));
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(() => result.current.loadMore());

        expect(seen).toEqual([null, "opaque::1"]);
        expect(
            useMessageStore.getState().conversations.map((c) => c.id),
        ).toEqual(["c1", "c2"]);
    });

    /*
     * A missing cursor is the end of the listing, not a first page. Treating
     * it as one restarts from the top and appends every row already on screen
     * a second time.
     */
    it("does not restart from the top once the cursor runs out", async () => {
        let calls = 0;
        server.use(
            http.get(`${BASE}/conversations`, () => {
                calls += 1;
                return HttpResponse.json({
                    data: [row("c1")],
                    meta: { timestamp: "t", nextCursor: null },
                });
            }),
        );

        const { result } = renderHook(() => useConversations("ACCEPTED"));
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.hasMore).toBe(false);

        await act(() => result.current.loadMore());

        expect(calls).toBe(1);
        expect(useMessageStore.getState().conversations).toHaveLength(1);
    });

    it("asks for the requests tab when that is the tab", async () => {
        const seen: (string | null)[] = [];
        server.use(
            http.get(`${BASE}/conversations`, ({ request }) => {
                seen.push(new URL(request.url).searchParams.get("status"));
                return HttpResponse.json({
                    data: [
                        { ...row("r1"), status: "PENDING", isRequest: true },
                    ],
                    meta: { timestamp: "t", nextCursor: null },
                });
            }),
        );

        const { result } = renderHook(() => useConversations("PENDING"));
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(seen).toEqual(["PENDING"]);
        expect(useMessageStore.getState().requests).toHaveLength(1);
        // The request badge has no endpoint of its own; it is the length of
        // this listing, by design.
        expect(useMessageStore.getState().requestCount).toBe(1);
    });

    it("surfaces an error and can be retried", async () => {
        let fail = true;
        server.use(
            http.get(`${BASE}/conversations`, () => {
                if (fail) {
                    return HttpResponse.json(
                        {
                            type: "about:blank",
                            title: "InternalServerError",
                            status: 500,
                            detail: "An unexpected error occurred.",
                        },
                        { status: 500 },
                    );
                }
                return HttpResponse.json({
                    data: [row("c1")],
                    meta: { timestamp: "t", nextCursor: null },
                });
            }),
        );

        const { result } = renderHook(() => useConversations("ACCEPTED"));
        await waitFor(() => expect(result.current.error).not.toBeNull());

        fail = false;
        await act(() => result.current.fetch());

        expect(result.current.error).toBeNull();
        expect(useMessageStore.getState().conversations).toHaveLength(1);
    });

    /*
     * Realtime saw a conversation this page does not hold. The payload is a
     * preview, not a row, so there is nothing to insert — the listing re-reads
     * instead of growing a row out of half of one.
     */
    it("re-reads when realtime says the page is behind", async () => {
        let calls = 0;
        server.use(
            http.get(`${BASE}/conversations`, () => {
                calls += 1;
                return HttpResponse.json({
                    data: [row("c1")],
                    meta: { timestamp: "t", nextCursor: null },
                });
            }),
        );

        const { result } = renderHook(() => useConversations("ACCEPTED"));
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(calls).toBe(1);

        act(() => {
            useMessageStore.getState().applyIncoming({
                conversationId: "not-loaded",
                messageId: "m1",
                senderId: "u2",
                preview: "hi",
                hasMedia: false,
                createdAt: "2026-09-03T12:00:00.000Z",
            });
        });

        await waitFor(() => expect(calls).toBe(2));
    });
});
