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
        // The list defining the count is the whole defect. Counting a page of
        // 20 cannot describe 35 unread notifications, so the count comes from
        // `/notifications/unread-count` and this action only moves the list.
        it("replaces the list without touching unreadCount", () => {
            useNotificationStore.setState({ unreadCount: 35 });

            const list = [
                makeNotification(),
                makeNotification({ isRead: true }),
            ];

            useNotificationStore.getState().setNotifications(list);

            const state = useNotificationStore.getState();
            expect(state.notifications).toHaveLength(2);
            expect(state.unreadCount).toBe(35);
        });

        // This previously asserted unreadCount became 2 — recounted across the
        // appended page. That expectation was the bug: it made scrolling
        // redefine the badge and silently discard realtime increments, which
        // is why the defect survived. Appending must leave the count alone.
        it("appends to the existing list without touching unreadCount", () => {
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
            expect(state.unreadCount).toBe(1);
        });

        it("keeps a realtime increment when an older page is appended", () => {
            const store = useNotificationStore.getState();

            // Boot: the list and the count arrive from separate endpoints.
            store.setNotifications([makeNotification()], false);
            store.setUnreadCount(1);

            // Arrives over the socket; too thin to become a Notification, so
            // only the counter moves.
            store.incrementUnread();
            expect(useNotificationStore.getState().unreadCount).toBe(2);

            // Page 2 holds older notifications that were already read.
            store.setNotifications([makeNotification({ isRead: true })], true);

            expect(useNotificationStore.getState().unreadCount).toBe(2);
        });

        // This used to assert the opposite — that a fresh first page resynced
        // the count from the list. That derivation was the cap: a first page
        // of read notifications would zero a badge the server says is 7.
        it("leaves the count alone even on a fresh first page", () => {
            useNotificationStore.setState({
                notifications: [makeNotification()],
                unreadCount: 7,
            });

            useNotificationStore
                .getState()
                .setNotifications([makeNotification({ isRead: true })], false);

            expect(useNotificationStore.getState().unreadCount).toBe(7);
        });
    });

    describe("setUnreadCount", () => {
        it("takes the server's number verbatim", () => {
            useNotificationStore.getState().setUnreadCount(35);

            expect(useNotificationStore.getState().unreadCount).toBe(35);
        });

        // The badge is a count of things the list does not have to contain.
        it("does not need the list to agree with it", () => {
            useNotificationStore
                .getState()
                .setNotifications([makeNotification()]);
            useNotificationStore.getState().setUnreadCount(35);

            const state = useNotificationStore.getState();
            expect(state.notifications).toHaveLength(1);
            expect(state.unreadCount).toBe(35);
        });

        it("accepts zero", () => {
            useNotificationStore.setState({ unreadCount: 9 });

            useNotificationStore.getState().setUnreadCount(0);

            expect(useNotificationStore.getState().unreadCount).toBe(0);
        });

        // A realtime increment on top of a server count is the normal steady
        // state: the socket says "one more", not "here is the new total".
        it("is the base a realtime increment builds on", () => {
            useNotificationStore.getState().setUnreadCount(35);
            useNotificationStore.getState().incrementUnread();

            expect(useNotificationStore.getState().unreadCount).toBe(36);
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
