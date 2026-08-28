import { api } from "../../../core/api/client";
import type { Notification } from "./notification.types";

export const notificationApi = {
    getNotifications: (page = 1, limit = 20): Promise<Notification[]> => {
        const qs = `?page=${page}&limit=${limit}`;
        return api.get<Notification[]>(`/notifications${qs}`);
    },

    /**
     * The badge's only source of truth.
     *
     * It used to be counted off the first page, which capped the badge at the
     * page size: an account with 35 unread notifications saw 20. The count is
     * a scalar the server already knows, so it is asked for directly.
     *
     * `apiClient` unwraps `ApiResponse.data`, so what lands here is the
     * `{ count }` envelope, not the whole document.
     *
     * Called at boot and after a mark-all-read that failed ambiguously —
     * never on a timer. The realtime socket delivers increments.
     */
    getUnreadCount: (): Promise<number> =>
        api
            .get<{ count: number }>("/notifications/unread-count")
            .then((data) => data.count),

    markAllRead: (): Promise<void> =>
        api.patch<void>("/notifications/read-all", {}),
};
