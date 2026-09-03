import { renderHook, act } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../../tests/msw-server";

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

import { useSendMessage, isPendingMessage } from "./useSendMessage";
import { useMessageStore } from "../store/message.store";
import { useToastStore } from "../../../shared/store/toast.store";
import { useAuthStore } from "../../../core/auth/auth.store";

const BASE = "http://localhost:8080/api/v1";

const sent = {
    id: "m-server",
    conversationId: "c1",
    senderId: "u1",
    content: "hello",
    mediaUrls: [],
    isSensitive: false,
    mediaPending: false,
    mediaRejected: false,
    isDeleted: false,
    isMine: true,
    createdAt: "2026-09-03T12:00:00.000Z",
};

beforeEach(() => {
    useMessageStore.setState(useMessageStore.getInitialState());
    useToastStore.setState(useToastStore.getInitialState());
    useAuthStore.setState({
        user: { id: "u1", username: "me", isEmailVerified: true },
        token: null,
        isAuthenticated: true,
    });
});

describe("useSendMessage", () => {
    it("swaps the optimistic bubble for the server copy", async () => {
        server.use(
            http.post(`${BASE}/conversations/c1/messages`, () =>
                HttpResponse.json({ data: sent }, { status: 201 }),
            ),
        );

        const { result } = renderHook(() => useSendMessage("c1"));

        await act(async () => {
            await result.current.send("hello");
        });

        const messages = useMessageStore.getState().messages;
        expect(messages.map((m) => m.id)).toEqual(["m-server"]);
        expect(useToastStore.getState().toasts).toHaveLength(0);
    });

    /*
     * A message that silently vanishes is indistinguishable from one that was
     * sent. That matters more here than it does for a like, so the bubble goes
     * *and* the reason is said out loud.
     */
    it("removes the bubble and says why when the send fails", async () => {
        server.use(
            http.post(`${BASE}/conversations/c1/messages`, () =>
                HttpResponse.json(
                    {
                        type: "about:blank",
                        title: "MessageNotSendableError",
                        status: 403,
                        detail: "You cannot send messages in this conversation.",
                    },
                    { status: 403 },
                ),
            ),
        );

        const { result } = renderHook(() => useSendMessage("c1"));

        let ok = true;
        await act(async () => {
            ok = await result.current.send("hello");
        });

        expect(ok).toBe(false);
        expect(useMessageStore.getState().messages).toHaveLength(0);
        expect(useToastStore.getState().toasts[0].message).toBe(
            "You cannot send messages in this conversation.",
        );
    });

    /*
     * Five writes a minute is low enough that an ordinary exchange reaches it,
     * so the 429 is not an edge case — and it is one of only two titles the
     * client answers in its own words rather than the server English.
     */
    it("answers a rate limit in the reader own language", async () => {
        server.use(
            http.post(`${BASE}/conversations/c1/messages`, () =>
                HttpResponse.json(
                    {
                        type: "about:blank",
                        title: "TooManyRequestsError",
                        status: 429,
                        detail: "Rate limit exceeded, retry in 1 minute.",
                    },
                    { status: 429 },
                ),
            ),
        );

        const { result } = renderHook(() => useSendMessage("c1"));
        await act(async () => {
            await result.current.send("hello");
        });

        expect(useToastStore.getState().toasts[0].message).toBe(
            "You are going a little fast. Try again in a minute.",
        );
    });

    it("marks the bubble as unacknowledged while it is in flight", async () => {
        server.use(
            http.post(`${BASE}/conversations/c1/messages`, () =>
                HttpResponse.json({ data: sent }, { status: 201 }),
            ),
        );

        const { result } = renderHook(() => useSendMessage("c1"));

        await act(async () => {
            // `addMessage` runs before the request is even made, so the store
            // already holds the bubble on the line after this one.
            const pending = result.current.send("hello");

            const [optimistic] = useMessageStore.getState().messages;
            expect(optimistic.isMine).toBe(true);
            expect(optimistic.content).toBe("hello");
            // The delete control keys off this: a message the server has not
            // acknowledged has no id to withdraw.
            expect(isPendingMessage(optimistic.id)).toBe(true);

            await pending;
        });

        expect(
            isPendingMessage(useMessageStore.getState().messages[0].id),
        ).toBe(false);
    });

    it("sends the media urls it was given", async () => {
        let body: unknown;
        server.use(
            http.post(
                `${BASE}/conversations/c1/messages`,
                async ({ request }) => {
                    body = await request.json();
                    return HttpResponse.json({ data: sent }, { status: 201 });
                },
            ),
        );

        const { result } = renderHook(() => useSendMessage("c1"));
        await act(async () => {
            await result.current.send("look", ["https://cdn.example/a.jpg"]);
        });

        expect(body).toEqual({
            content: "look",
            mediaUrls: ["https://cdn.example/a.jpg"],
        });
    });
});
