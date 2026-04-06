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
    referenceId: string;
    createdAt: string;
    isRead: boolean;
}

export interface NotificationMeta {
    total: number;
    currentPage: number;
    totalPages: number;
    limit: number;
}
