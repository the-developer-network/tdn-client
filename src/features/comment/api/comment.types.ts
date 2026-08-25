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
    createdAt: string;
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
