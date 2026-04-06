import { useEffect, useRef } from "react";
import { useAuthStore } from "../../../core/auth/auth.store";
import { useNotificationStore } from "../store/notification.store";
import type { RealtimeNotificationPayload } from "../api/notification.types";

const WS_URL = import.meta.env.PROD
    ? "wss://api.developernetwork.net/realtime/ws"
    : "ws://localhost:8080/realtime/ws";

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

    useEffect(() => {
        if (!isAuthenticated || !token) {
            wsRef.current?.close();
            wsRef.current = null;
            return;
        }

        const url = `${WS_URL}?token=${token}`;
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onerror = () => {};

        ws.onmessage = (event: MessageEvent) => {
            try {
                const message = JSON.parse(event.data as string) as WsMessage;
                if (message.event === "new-notification") {
                    incrementUnread();
                }
            } catch {
                // ignore malformed messages
            }
        };

        return () => {
            ws.close();
            wsRef.current = null;
        };
    }, [isAuthenticated, token, incrementUnread]);
}
