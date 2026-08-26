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

export interface Post {
    id: string;
    content: string;
    type: PostType;
    mediaUrls: string[];
    createdAt: string;
    likeCount: number;
    commentCount: number;
    isLiked: boolean;
    isBookmarked: boolean;
    author: PostAuthor;
    tags?: PostTag[];
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
