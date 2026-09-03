import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Zustand `persist` captures storage at module-evaluation time, and the API
// client reads `access_token` at runtime — stub before any import runs.
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

import { useAuthStore } from "../auth/auth.store";
import { useToastStore } from "../../shared/store/toast.store";
import { translate } from "../../shared/i18n/translate";
import { useNotificationStore } from "../../features/notifications/store/notification.store";
import { useMessageStore } from "../../features/messages/store/message.store";
import { useRealtimeSocket } from "./useRealtimeSocket";

const sockets: FakeWebSocket[] = [];

class FakeWebSocket {
    static readonly OPEN = 1;
    url: string;
    readyState = FakeWebSocket.OPEN;
    sent: string[] = [];
    onopen: (() => void) | null = null;
    onclose: (() => void) | null = null;
    onerror: (() => void) | null = null;
    onmessage: ((event: MessageEvent) => void) | null = null;

    constructor(url: string) {
        this.url = url;
        sockets.push(this);
    }

    send(data: string) {
        this.sent.push(data);
    }

    close() {
        this.readyState = 3;
    }
}

beforeEach(() => {
    sockets.length = 0;
    localStorage.clear();
    useNotificationStore.setState(useNotificationStore.getInitialState());
    useMessageStore.setState(useMessageStore.getInitialState());
    useAuthStore.setState({
        user: null,
        token: null,
        isAuthenticated: false,
    });
    // Note: no `vi.unstubAllGlobals()` teardown — it would also drop the
    // hoisted `localStorage` stub that every later test depends on.
    vi.stubGlobal("WebSocket", FakeWebSocket);
});

describe("useRealtimeSocket", () => {
    it("connects and authenticates with the stored access token", async () => {
        localStorage.setItem("access_token", "jwt-123");
        useAuthStore.setState({ isAuthenticated: true, token: "jwt-123" });

        renderHook(() => useRealtimeSocket());

        await waitFor(() => expect(sockets).toHaveLength(1));
        sockets[0].onopen?.();

        expect(JSON.parse(sockets[0].sent[0])).toEqual({
            event: "auth",
            token: "jwt-123",
        });
    });

    // Regression: `token` is not persisted (auth.store partialises to
    // { user, isAuthenticated }), so after a reload the store rehydrates
    // authenticated with a null token while the JWT is still in localStorage.
    // Gating on the store field meant the socket silently never opened.
    it("connects after a reload, when only localStorage holds the token", async () => {
        localStorage.setItem("access_token", "jwt-from-storage");
        useAuthStore.setState({ isAuthenticated: true, token: null });

        renderHook(() => useRealtimeSocket());

        await waitFor(() => expect(sockets).toHaveLength(1));
        sockets[0].onopen?.();

        expect(JSON.parse(sockets[0].sent[0])).toEqual({
            event: "auth",
            token: "jwt-from-storage",
        });
    });

    // The API mounts realtimeRoutes at prefix "/api/v1/realtime" and declares
    // GET "/ws" inside it. This URL is written out by hand rather than derived
    // from the API client's base URL, so it can drift from it silently — pin it.
    it("connects to the path the API actually serves", async () => {
        localStorage.setItem("access_token", "jwt-123");
        useAuthStore.setState({ isAuthenticated: true, token: "jwt-123" });

        renderHook(() => useRealtimeSocket());

        await waitFor(() => expect(sockets).toHaveLength(1));

        expect(sockets[0].url).toBe("ws://localhost:8080/api/v1/realtime/ws");
    });

    it("does not connect when unauthenticated", () => {
        renderHook(() => useRealtimeSocket());

        expect(sockets).toHaveLength(0);
    });

    it("does not connect when authenticated but no token exists anywhere", () => {
        useAuthStore.setState({ isAuthenticated: true, token: null });

        renderHook(() => useRealtimeSocket());

        expect(sockets).toHaveLength(0);
    });
});

/**
 * Direct messages ride this connection rather than opening a second one, which
 * the API asks clients not to do. So one socket now feeds two features, and
 * what matters is that each frame reaches the right store — the rules
 * themselves are tested against those stores directly.
 */
describe("useRealtimeSocket dispatch", () => {
    function connect() {
        localStorage.setItem("access_token", "jwt-123");
        useAuthStore.setState({ isAuthenticated: true, token: "jwt-123" });
        renderHook(() => useRealtimeSocket());
    }

    function deliver(event: string, payload?: unknown) {
        act(() => {
            sockets[0].onmessage?.({
                data: JSON.stringify({ event, payload }),
            } as MessageEvent);
        });
    }

    const incoming = {
        conversationId: "c1",
        messageId: "m1",
        senderId: "u2",
        preview: "hello",
        hasMedia: false,
        createdAt: "2026-09-03T12:00:00.000Z",
    };

    beforeEach(async () => {
        connect();
        await waitFor(() => expect(sockets).toHaveLength(1));
    });

    it("raises the notification badge on a notification", () => {
        deliver("new-notification", { type: "LIKE", issuerId: "u2" });

        expect(useNotificationStore.getState().unreadCount).toBe(1);
    });

    it("raises the message badge on a new message", () => {
        deliver("message:new", incoming);

        expect(useMessageStore.getState().unreadCount).toBe(1);
    });

    /*
     * The distinction the API sends two events for: a message opening a
     * request must not raise the unread badge, or an open inbox becomes a
     * broadcast channel with a notification attached.
     */
    it("counts a request without raising the message badge", () => {
        deliver("conversation:request", incoming);

        expect(useMessageStore.getState().requestCount).toBe(1);
        expect(useMessageStore.getState().unreadCount).toBe(0);
    });

    it("routes a read, a deletion and a rejection to the message store", () => {
        act(() => {
            useMessageStore.getState().setThread(
                {
                    id: "c1",
                    status: "ACCEPTED",
                    isRequest: false,
                    canSend: true,
                    participant: {
                        id: "u2",
                        username: "ayse",
                        avatarUrl: "",
                    },
                    unreadCount: 0,
                    lastMessagePreview: null,
                    lastMessageAt: null,
                    otherLastReadAt: null,
                    createdAt: "2026-09-01T00:00:00.000Z",
                },
                [
                    {
                        id: "m1",
                        conversationId: "c1",
                        senderId: "u2",
                        content: "hello",
                        mediaUrls: [],
                        isSensitive: false,
                        mediaPending: true,
                        mediaRejected: false,
                        isDeleted: false,
                        isMine: false,
                        createdAt: "2026-09-03T12:00:00.000Z",
                    },
                ],
                null,
            );
        });

        deliver("message:read", {
            conversationId: "c1",
            senderId: "u2",
            readAt: "2026-09-03T13:00:00.000Z",
        });
        expect(
            useMessageStore.getState().activeConversation?.otherLastReadAt,
        ).toBe("2026-09-03T13:00:00.000Z");

        deliver("message:media_rejected", {
            conversationId: "c1",
            messageId: "m1",
            senderId: "u1",
        });
        expect(useMessageStore.getState().messages[0].mediaRejected).toBe(true);

        deliver("message:deleted", {
            conversationId: "c1",
            messageId: "m1",
            senderId: "u2",
        });
        expect(useMessageStore.getState().messages[0].isDeleted).toBe(true);
    });

    // Newer servers are expected to send events this build has not heard of.
    it("ignores an unknown event without touching either store", () => {
        deliver("something:new", { anything: true });

        expect(useMessageStore.getState().unreadCount).toBe(0);
        expect(useNotificationStore.getState().unreadCount).toBe(0);
    });

    it("ignores a malformed frame", () => {
        act(() => {
            sockets[0].onmessage?.({ data: "not json" } as MessageEvent);
        });

        expect(useMessageStore.getState().unreadCount).toBe(0);
    });
});

/**
 * The API accepts every upgrade and only closes once it has read the auth
 * frame: `realtime.routes.ts` closes with 1008 "Policy Violation: Invalid
 * token" when `fastify.jwt.verify` throws, and answers a good token with
 * `{ event: "auth_success" }`. So a rejected connection still fires `onopen`
 * first, and "the socket opened" says nothing about whether it is usable.
 */
function setOnline(value: boolean) {
    // `navigator.onLine` is a getter on Navigator.prototype, so it has to be
    // shadowed with an own property rather than spied on.
    Object.defineProperty(navigator, "onLine", {
        configurable: true,
        get: () => value,
    });
}

describe("useRealtimeSocket reconnect", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        useToastStore.setState({ toasts: [] });
    });

    afterEach(() => {
        vi.useRealTimers();
        setOnline(true);
    });

    function rejectAuth(ws: FakeWebSocket) {
        ws.onopen?.();
        ws.onclose?.();
    }

    const latest = () => sockets[sockets.length - 1];

    /** Burns the whole retry budget: the first attempt plus five redials. */
    async function exhaustRetries() {
        rejectAuth(latest());
        for (let i = 0; i < 5; i++) {
            await vi.advanceTimersByTimeAsync(60_000);
            rejectAuth(latest());
        }
    }

    it("stops dialling after MAX_RETRIES when the server keeps rejecting the token", async () => {
        localStorage.setItem("access_token", "expired-jwt");
        useAuthStore.setState({ isAuthenticated: true, token: "expired-jwt" });

        renderHook(() => useRealtimeSocket());
        expect(sockets).toHaveLength(1);

        await exhaustRetries();
        expect(sockets).toHaveLength(6);

        // The budget is spent, so nothing further may be dialled. Without this
        // the client redials once a second for as long as the tab is open.
        await vi.advanceTimersByTimeAsync(60_000);
        expect(sockets).toHaveLength(6);
    });

    it("tells the user notifications are unavailable once it gives up", async () => {
        localStorage.setItem("access_token", "expired-jwt");
        useAuthStore.setState({ isAuthenticated: true, token: "expired-jwt" });

        renderHook(() => useRealtimeSocket());
        await exhaustRetries();

        // Asserted here rather than after advancing again: toasts dismiss
        // themselves after 4 s, which any further advance would trigger.
        expect(
            useToastStore.getState().toasts.map((toast) => toast.message),
        ).toContain(translate("common.notificationsUnavailable"));
    });

    it("authenticates a reconnect with the token in storage now, not the one read at mount", async () => {
        localStorage.setItem("access_token", "jwt-old");
        useAuthStore.setState({ isAuthenticated: true, token: null });

        renderHook(() => useRealtimeSocket());
        expect(sockets).toHaveLength(1);

        sockets[0].onopen?.();
        sockets[0].onmessage?.(
            new MessageEvent("message", {
                data: JSON.stringify({ event: "auth_success" }),
            }),
        );

        // What `apiClient` does when a 401 is refreshed: the new JWT is written
        // to storage only — `setAuth` is not called, so neither `token` nor
        // `isAuthenticated` changes and the effect never re-runs.
        localStorage.setItem("access_token", "jwt-new");
        sockets[0].onclose?.();

        await vi.advanceTimersByTimeAsync(60_000);

        expect(sockets).toHaveLength(2);
        sockets[1].onopen?.();
        expect(JSON.parse(sockets[1].sent[0])).toEqual({
            event: "auth",
            token: "jwt-new",
        });
    });

    it("disarms the offline resume listener when the effect tears down", () => {
        localStorage.setItem("access_token", "jwt-a");
        useAuthStore.setState({ isAuthenticated: true, token: "jwt-a" });
        setOnline(false);

        renderHook(() => useRealtimeSocket());
        expect(sockets).toHaveLength(1);

        // Offline, the hook arms an `online` listener instead of backing off.
        sockets[0].onclose?.();

        // A new token tears that effect down and dials again — the listener the
        // dead effect left behind must not dial a second time on top of it.
        setOnline(true);
        act(() => {
            useAuthStore.setState({ token: "jwt-b" });
        });
        expect(sockets).toHaveLength(2);

        act(() => {
            window.dispatchEvent(new Event("online"));
        });
        expect(sockets).toHaveLength(2);
    });
});
