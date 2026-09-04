import type { Mention } from "../../../shared/utils/mentions";
export interface CommentAuthor {
    id: string;
    username: string;
    fullName?: string;
    avatarUrl: string;
    isMe?: boolean;
}

export interface Comment {
    id: string;
    content: string;
    mediaUrls: string[];
    /**
     * Both are content-level, not per-media: if any one attachment is judged
     * sensitive the whole item is flagged, and all of its media is blurred.
     * There is no per-file flag to be more precise with.
     */
    isSensitive: boolean;
    /**
     * A video is stored before it is checked and hidden until it passes, so
     * `mediaUrls` arrives as `[]` while this is true. That is not an item
     * without media — it is media that cannot be shown yet.
     */
    mediaPending: boolean;
    createdAt: string;
    /**
     * The accounts the API resolved out of the body. Always present; `[]` when
     * it names nobody.
     */
    mentions: Mention[];
    likeCount: number;
    replyCount: number;
    isLiked: boolean;
    isBookmarked: boolean;
    author: CommentAuthor;
    parentId: string | null;
    /**
     * A comment hangs off a post or an article, never both and never neither —
     * the database enforces exactly one of these being set. Narrow before use
     * rather than asserting with `!`.
     */
    postId: string | null;
    articleId: string | null;
}

/**
 * What a comment is attached to. The two live under different collection
 * paths (`/posts/:id/comments`, `/articles/:id/comments`) while every
 * per-comment route (`/comments/:id/...`) is shared.
 */
export type CommentTarget =
    { type: "post"; id: string } | { type: "article"; id: string };

export interface CreateCommentBody {
    content: string;
    parentId?: string;
    mediaUrls?: string[];
}

export interface GetCommentsParams {
    page?: number;
    limit?: number;
}
