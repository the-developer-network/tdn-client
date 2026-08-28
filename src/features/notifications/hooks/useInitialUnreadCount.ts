import { useEffect } from "react";
import { useAuthStore } from "../../../core/auth/auth.store";
import { notificationApi } from "../api/notification.api";
import { useNotificationStore } from "../store/notification.store";

/**
 * Seeds the notification list and the badge at boot.
 *
 * Two requests, not one, and they are independent on purpose. The name used to
 * be a lie: it fetched the first page and counted the unread ones in it, so the
 * badge could never read higher than the page size. The count now comes from
 * the endpoint that knows it.
 *
 * They go out together and settle separately — a failed count must not cost the
 * list, and a failed list must not cost the count. Both stay best-effort and
 * silent: nothing here is worth a toast on a cold start.
 */
export function useInitialUnreadCount() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const setNotifications = useNotificationStore(
        (state) => state.setNotifications,
    );
    const setUnreadCount = useNotificationStore(
        (state) => state.setUnreadCount,
    );

    useEffect(() => {
        if (!isAuthenticated) {
            setNotifications([]);
            // Explicit now that the list no longer defines the count. Without
            // it the previous account's badge survives a sign-out.
            setUnreadCount(0);
            return;
        }

        // Guards the sign-out case: a response landing after the effect has
        // been torn down would otherwise repopulate what the branch above
        // just cleared.
        let cancelled = false;

        notificationApi
            .getNotifications(1, 20)
            .then((list) => {
                if (!cancelled) setNotifications(list);
            })
            .catch(() => {
                // Best-effort init — silently ignore errors
            });

        notificationApi
            .getUnreadCount()
            .then((count) => {
                if (!cancelled) setUnreadCount(count);
            })
            .catch(() => {
                // Best-effort init — the badge stays at its last known value
            });

        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, setNotifications, setUnreadCount]);
}
