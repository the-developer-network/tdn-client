/**
 * Mirrors the API's enum exactly. `COMMENT_REPLY` was missing here for long
 * enough to ship a crash: `MESSAGE_KEYS` is a `Record<NotificationType, ...>`,
 * so a value absent from this union is also absent from that map without
 * TypeScript noticing, and the card then called `t(undefined)`.
 */
export type NotificationType =
    | "FOLLOW"
    | "NEW_POST"
    | "LIKE"
    | "COMMENT"
    | "COMMENT_LIKE"
    | "COMMENT_REPLY"
    | "QUOTE";

export interface Notification {
    recipientId: string;
    issuerId: string;
    username: string;
    type: NotificationType;
    avatarUrl: string;
    referenceId: string | null;
    createdAt: string;
    isRead: boolean;
}

export interface RealtimeNotificationPayload {
    type: NotificationType;
    issuerId: string;
    /**
     * On a `QUOTE` this is the quote, not the post that was quoted — the
     * recipient wrote the original and wants to see what was said about it.
     */
    postId?: string;
    referenceId?: string;
}

export interface NotificationMeta {
    total: number;
    currentPage: number;
    totalPages: number;
    limit: number;
}
