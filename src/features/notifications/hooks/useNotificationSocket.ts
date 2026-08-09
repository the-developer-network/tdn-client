import { useEffect, useRef } from "react";
import { useAuthStore } from "../../../core/auth/auth.store";
import { useNotificationStore } from "../store/notification.store";
import { useToastStore } from "../../../shared/store/toast.store";
import { translate } from "../../../shared/i18n/translate";
import type { RealtimeNotificationPayload } from "../api/notification.types";

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
    // `auth_success` carries no payload, so this cannot be required.
    payload?: RealtimeNotificationPayload;
}

export function useNotificationSocket() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    // `auth.store` persists only { user, isAuthenticated }, so after a reload
    // the store's token is null while the JWT is still in localStorage — the
    // source of truth the API client reads on every request. Keep the store
    // field as a dependency so a fresh login retriggers the effect, but fall
    // back to storage so a reloaded session still connects.
    const storeToken = useAuthStore((state) => state.token);
    const incrementUnread = useNotificationStore(
        (state) => state.incrementUnread,
    );
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
                    if (message.event === "new-notification") {
                        incrementUnread();
                    }
                } catch {
                    // ignore malformed messages
                }
            };
        }

        connect();

        return stop;
    }, [isAuthenticated, storeToken, incrementUnread]);
}
