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
            const notifications = append
                ? [...state.notifications, ...list]
                : list;
            const unreadCount = notifications.filter((n) => !n.isRead).length;
            return { notifications, unreadCount };
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
