import { create } from "zustand";
import type { Notification } from "../api/notification.types";

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    setNotifications: (list: Notification[], append?: boolean) => void;
    addNotification: (notification: Notification) => void;
    incrementUnread: () => void;
    markAllRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
    notifications: [],
    unreadCount: 0,

    setNotifications: (list, append = false) =>
        set((state) => {
            // Appending a page is a view operation, so it must not redefine the
            // badge. Recounting here wiped every `incrementUnread` — and those
            // increments cannot be rebuilt from the list, because the realtime
            // payload carries only { type, issuerId, postId } and cannot be
            // turned into a Notification.
            if (append) {
                return { notifications: [...state.notifications, ...list] };
            }

            // A fresh first page is a resync, so the count is derived again.
            return {
                notifications: list,
                unreadCount: list.filter((n) => !n.isRead).length,
            };
        }),

    addNotification: (notification) =>
        set((state) => ({
            notifications: [notification, ...state.notifications],
            unreadCount: notification.isRead
                ? state.unreadCount
                : state.unreadCount + 1,
        })),

    incrementUnread: () =>
        set((state) => ({ unreadCount: state.unreadCount + 1 })),

    markAllRead: () =>
        set((state) => ({
            notifications: state.notifications.map((n) => ({
                ...n,
                isRead: true,
            })),
            unreadCount: 0,
        })),
}));
