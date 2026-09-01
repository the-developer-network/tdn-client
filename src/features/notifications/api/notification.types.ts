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
    | "QUOTE"
    | "MEDIA_REJECTED";

export interface Notification {
    recipientId: string;
    /**
     * On a `MEDIA_REJECTED` this equals `recipientId`, and `username` and
     * `avatarUrl` are the recipient's own. The notice comes from the platform,
     * which has no account to attribute it to. Read as an issuer it says the
     * reader did this to themselves, so that type ignores all three.
     */
    issuerId: string;
    username: string;
    type: NotificationType;
    avatarUrl: string;
    /** The most specific target: the comment, else the article, else the post. */
    referenceId: string | null;
    /**
     * Present on the types that have somewhere to go. `MEDIA_REJECTED` fills
     * them in four combinations — a post; a post and a comment; a comment,
     * article and slug; or none of them, when a video was uploaded and the
     * post was never sent.
     *
     * `articleId` and `articleSlug` are not read here: a comment on an article
     * is still reached through `/comments/:commentId`, and that is the right
     * place to land — the media was taken off the comment, not off the top of
     * the article. They arrive for consistency with the other comment
     * notifications, and are left alone on purpose.
     */
    postId?: string | null;
    commentId?: string | null;
    articleId?: string | null;
    articleSlug?: string | null;
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
