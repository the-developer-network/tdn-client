import { useEffect } from "react";
import { useAuthStore } from "../../../core/auth/auth.store";
import { notificationApi } from "../api/notification.api";
import { useNotificationStore } from "../store/notification.store";

export function useInitialUnreadCount() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const setNotifications = useNotificationStore(
        (state) => state.setNotifications,
    );

    useEffect(() => {
        if (!isAuthenticated) {
            setNotifications([]);
            return;
        }

        notificationApi
            .getNotifications(1, 20)
            .then(setNotifications)
            .catch(() => {
                // Best-effort init — silently ignore errors
            });
    }, [isAuthenticated, setNotifications]);
}
