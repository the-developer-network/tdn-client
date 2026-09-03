import { useEffect, useRef } from "react";
import { useAuthStore } from "../auth/auth.store";
import { useNotificationStore } from "../../features/notifications/store/notification.store";
import { useMessageStore } from "../../features/messages/store/message.store";
import { useToastStore } from "../../shared/store/toast.store";
import { translate } from "../../shared/i18n/translate";
import type {
    IncomingMessagePayload,
    MediaRejectedPayload,
    MessageDeletedPayload,
    MessageReadPayload,
} from "../../features/messages/api/message.types";

// The API registers its realtime routes under the same `/api/v1` prefix as
// every REST endpoint — `register(realtimeRoutes, { prefix: "/api/v1/realtime" })`
// with a `GET /ws` inside it. Omitting the prefix here meant the socket dialled
// a path the server does not serve, so it never connected on any environment.
const WS_URL = import.meta.env.PROD
    ? "wss://api.developernetwork.net/api/v1/realtime/ws"
    : "ws://localhost:8080/api/v1/realtime/ws";

const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;
const MAX_RETRIES = 5;

interface WsMessage {
    event: string;
    // `auth_success` carries no payload, so this cannot be required. It is
    // `unknown` rather than a union because the frame is narrowed by `event`
    // below and one union would let a notification payload be read as a
    // message one wherever the two happen to overlap.
    payload?: unknown;
}

/**
 * The dispatch table. Direct messages ride the notification socket rather than
 * opening their own — the API is explicit that a client should hold one
 * connection — so this hook now serves two features and belongs to neither,
 * which is why it sits in `core/` beside the API client.
 *
 * Every handler is a single store call. Nothing here decides anything: the
 * reducers in the stores own the rules, so they stay testable without a
 * socket, and this file stays the connection logic it already was.
 */
function dispatch(event: string, payload: unknown): void {
    const messages = useMessageStore.getState();

    switch (event) {
        case "new-notification":
            useNotificationStore.getState().incrementUnread();
            return;
        case "message:new":
            messages.applyIncoming(payload as IncomingMessagePayload);
            return;
        // Deliberately not `message:new`: a message that opens a request must
        // not raise the unread badge, which is the whole reason the API sends
        // a separate event for it.
        case "conversation:request":
            messages.applyRequest(payload as IncomingMessagePayload);
            return;
        case "message:read":
            messages.applyRead(payload as MessageReadPayload);
            return;
        case "message:deleted":
            messages.applyDeleted(payload as MessageDeletedPayload);
            return;
        case "message:media_rejected":
            messages.applyMediaRejected(payload as MediaRejectedPayload);
            return;
        default:
            // An event this build does not know about. Newer servers are
            // expected to send some.
            return;
    }
}

export function useRealtimeSocket() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    // `auth.store` persists only { user, isAuthenticated }, so after a reload
    // the store's token is null while the JWT is still in localStorage — the
    // source of truth the API client reads on every request. Keep the store
    // field as a dependency so a fresh login retriggers the effect, but fall
    // back to storage so a reloaded session still connects.
    const storeToken = useAuthStore((state) => state.token);
    const wsRef = useRef<WebSocket | null>(null);
    const retryCountRef = useRef(0);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const activeRef = useRef(false);
    const onlineHandlerRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        // Read at dial time, not once per effect. `apiClient` refreshes the JWT
        // by writing `access_token` straight to storage without going through
        // `setAuth`, so neither `isAuthenticated` nor `storeToken` changes and
        // this effect never re-runs — a token captured here would be re-sent,
        // already expired, on every reconnect for the rest of the session.
        const readToken = () =>
            useAuthStore.getState().token ??
            localStorage.getItem("access_token");

        function stop() {
            activeRef.current = false;
            if (retryTimerRef.current) {
                clearTimeout(retryTimerRef.current);
                retryTimerRef.current = null;
            }
            if (onlineHandlerRef.current) {
                window.removeEventListener("online", onlineHandlerRef.current);
                onlineHandlerRef.current = null;
            }
            wsRef.current?.close();
            wsRef.current = null;
        }

        if (!isAuthenticated || !readToken()) {
            stop();
            return;
        }

        activeRef.current = true;
        retryCountRef.current = 0;

        function connect() {
            if (!activeRef.current) return;

            const token = readToken();
            if (!token) return;

            const ws = new WebSocket(WS_URL);
            wsRef.current = ws;

            ws.onopen = () => {
                ws.send(JSON.stringify({ event: "auth", token }));
            };

            ws.onerror = () => {
                // handled by onclose
            };

            ws.onclose = () => {
                if (!activeRef.current) return;

                // Pause reconnect attempts when offline; resume on 'online' event
                if (!navigator.onLine) {
                    const handleOnline = () => {
                        window.removeEventListener("online", handleOnline);
                        onlineHandlerRef.current = null;
                        retryCountRef.current = 0;
                        connect();
                    };
                    // Held so the cleanup below can remove it. Left armed, it
                    // outlives the effect that registered it and dials again
                    // on top of the socket the next effect already opened.
                    onlineHandlerRef.current = handleOnline;
                    window.addEventListener("online", handleOnline);
                    return;
                }

                if (retryCountRef.current >= MAX_RETRIES) {
                    useToastStore.getState().addToast({
                        type: "info",
                        message: translate("common.notificationsUnavailable"),
                    });
                    return;
                }

                const delay = Math.min(
                    BACKOFF_BASE_MS * 2 ** retryCountRef.current,
                    BACKOFF_MAX_MS,
                );
                retryCountRef.current += 1;
                retryTimerRef.current = setTimeout(connect, delay);
            };

            ws.onmessage = (event: MessageEvent) => {
                try {
                    const message = JSON.parse(
                        event.data as string,
                    ) as WsMessage;
                    // The server accepts the upgrade before it has seen the
                    // auth frame and only then closes a bad token (1008), so
                    // `onopen` says nothing about whether the connection is
                    // usable. `auth_success` is the first point at which it
                    // does — resetting the retry budget on `onopen` instead
                    // meant a rejected token could never exhaust it, and the
                    // client redialled once a second for the life of the tab.
                    if (message.event === "auth_success") {
                        retryCountRef.current = 0;
                        return;
                    }
                    dispatch(message.event, message.payload);
                } catch {
                    // ignore malformed messages
                }
            };
        }

        connect();

        return stop;
        // `dispatch` reads every store through `getState()`, so the effect
        // depends on the session alone. Subscribing to a store action here
        // instead would tear the socket down and redial it on any change that
        // happened to give the action a new identity.
    }, [isAuthenticated, storeToken]);
}
