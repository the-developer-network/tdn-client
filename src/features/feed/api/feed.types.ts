import type { Comment } from "../../comment/api/comment.types";
import type { ArticleSummary } from "../../article/api/article.types";

export type PostType =
    "COMMUNITY" | "TECH_NEWS" | "SYSTEM_UPDATE" | "JOB_POSTING";

export type PostCategory = "AI" | "GAME" | "MOBILE" | "BACKEND" | "FRONTEND";

export interface PostAuthor {
    id: string;
    username: string;
    fullName?: string;
    avatarUrl: string;
    isMe?: boolean;
}
export interface PostTag {
    name: string;
}

/**
 * The post carried inside a quote.
 *
 * Deliberately not a `Post`. The API sends a trimmed shape here: no counters,
 * no `isLiked`/`isBookmarked`, and — this is the load-bearing part — no
 * `quotedPost` of its own. Quoting a quote is allowed, but the embedded card
 * is always exactly one level deep, so nothing here can recurse.
 */
export interface QuotedPost {
    id: string;
    content: string;
    mediaUrls: string[];
    createdAt: string;
    author: PostAuthor;
}

export interface Post {
    id: string;
    content: string;
    type: PostType;
    mediaUrls: string[];
    createdAt: string;
    likeCount: number;
    commentCount: number;
    /** How many times this post has been quoted. Server-maintained. */
    quoteCount: number;
    isLiked: boolean;
    isBookmarked: boolean;
    author: PostAuthor;
    tags?: PostTag[];
    /**
     * `null` on an ordinary post. A quote is not a separate entity — it is a
     * post that happens to carry another one — so every list, action and route
     * that already handles posts handles quotes with no special case.
     */
    quotedPost: QuotedPost | null;
}

export interface GetPostsParams {
    page?: number;
    limit?: number;
    type?: PostType;
    tag?: string;
    followedOnly?: boolean;
    categories?: PostCategory[];
}

/**
 * Articles arrive as summaries, not full items — the endpoint leaves `body`
 * out because it can run to 100 KB of markdown, and a saved list renders cards.
 */
export interface BookmarksResponse {
    posts: Post[];
    comments: Comment[];
    articles: ArticleSummary[];
}
