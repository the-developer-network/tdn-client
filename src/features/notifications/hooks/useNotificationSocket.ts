import { useEffect, useRef } from "react";
import { useAuthStore } from "../../../core/auth/auth.store";
import { useNotificationStore } from "../store/notification.store";
import type { RealtimeNotificationPayload } from "../api/notification.types";

const WS_URL = import.meta.env.PROD
    ? "wss://api.developernetwork.net/realtime/ws"
    : "ws://localhost:8080/realtime/ws";

const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;

interface WsMessage {
    event: string;
    payload: RealtimeNotificationPayload;
}

export function useNotificationSocket() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const token = useAuthStore((state) => state.token);
    const incrementUnread = useNotificationStore(
        (state) => state.incrementUnread,
    );
    const wsRef = useRef<WebSocket | null>(null);
    const retryCountRef = useRef(0);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const activeRef = useRef(false);

    useEffect(() => {
        if (!isAuthenticated || !token) {
            activeRef.current = false;
            if (retryTimerRef.current) {
                clearTimeout(retryTimerRef.current);
                retryTimerRef.current = null;
            }
            wsRef.current?.close();
            wsRef.current = null;
            return;
        }

        activeRef.current = true;
        retryCountRef.current = 0;

        function connect() {
            if (!activeRef.current) return;

            const url = `${WS_URL}?token=${token}`;
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                retryCountRef.current = 0;
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
                        retryCountRef.current = 0;
                        connect();
                    };
                    window.addEventListener("online", handleOnline);
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
                    if (message.event === "new-notification") {
                        incrementUnread();
                    }
                } catch {
                    // ignore malformed messages
                }
            };
        }

        connect();

        return () => {
            activeRef.current = false;
            if (retryTimerRef.current) {
                clearTimeout(retryTimerRef.current);
                retryTimerRef.current = null;
            }
            wsRef.current?.close();
            wsRef.current = null;
        };
    }, [isAuthenticated, token, incrementUnread]);
}
