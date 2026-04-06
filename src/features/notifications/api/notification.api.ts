import { api } from "../../../core/api/client";
import type { Notification } from "./notification.types";

export const notificationApi = {
    getNotifications: (page = 1, limit = 20): Promise<Notification[]> => {
        const qs = `?page=${page}&limit=${limit}`;
        return api.get<Notification[]>(`/notifications${qs}`);
    },

    markAllRead: (): Promise<void> =>
        api.patch<void>("/notifications/read-all", {}),
};
