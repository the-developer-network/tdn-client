import { beforeEach, describe, expect, it } from "vitest";
import type { Notification } from "../api/notification.types";
import { useNotificationStore } from "./notification.store";

const makeNotification = (
    overrides: Partial<Notification> = {},
): Notification => ({
    recipientId: "user-1",
    issuerId: "user-2",
    username: "otheruser",
    type: "LIKE",
    avatarUrl: "https://example.com/avatar.png",
    referenceId: "post-1",
    createdAt: new Date().toISOString(),
    isRead: false,
    ...overrides,
});

beforeEach(() => {
    useNotificationStore.setState({ notifications: [], unreadCount: 0 });
});

describe("useNotificationStore", () => {
    describe("setNotifications", () => {
        it("replaces the list and recalculates unreadCount", () => {
            const list = [
                makeNotification(),
                makeNotification({ isRead: true }),
            ];

            useNotificationStore.getState().setNotifications(list);

            const state = useNotificationStore.getState();
            expect(state.notifications).toHaveLength(2);
            expect(state.unreadCount).toBe(1);
        });

        it("appends to the existing list when append=true", () => {
            useNotificationStore.setState({
                notifications: [makeNotification()],
                unreadCount: 1,
            });

            useNotificationStore
                .getState()
                .setNotifications(
                    [makeNotification({ issuerId: "user-3" })],
                    true,
                );

            const state = useNotificationStore.getState();
            expect(state.notifications).toHaveLength(2);
            expect(state.unreadCount).toBe(2);
        });
    });

    describe("addNotification", () => {
        it("increments unreadCount when the notification is unread", () => {
            useNotificationStore
                .getState()
                .addNotification(makeNotification({ isRead: false }));

            const state = useNotificationStore.getState();
            expect(state.notifications).toHaveLength(1);
            expect(state.unreadCount).toBe(1);
        });

        it("does not increment unreadCount when the notification is already read", () => {
            useNotificationStore
                .getState()
                .addNotification(makeNotification({ isRead: true }));

            const state = useNotificationStore.getState();
            expect(state.notifications).toHaveLength(1);
            expect(state.unreadCount).toBe(0);
        });
    });

    describe("markAllRead", () => {
        it("sets every notification's isRead to true and resets unreadCount to 0", () => {
            useNotificationStore.setState({
                notifications: [makeNotification(), makeNotification()],
                unreadCount: 2,
            });

            useNotificationStore.getState().markAllRead();

            const { notifications, unreadCount } =
                useNotificationStore.getState();
            expect(unreadCount).toBe(0);
            expect(notifications.every((n) => n.isRead)).toBe(true);
        });
    });
});
