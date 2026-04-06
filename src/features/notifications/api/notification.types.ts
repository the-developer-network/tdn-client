export type NotificationType =
    | "FOLLOW"
    | "NEW_POST"
    | "LIKE"
    | "COMMENT"
    | "COMMENT_LIKE";

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
    postId?: string;
}

export interface NotificationMeta {
    total: number;
    currentPage: number;
    totalPages: number;
    limit: number;
}
