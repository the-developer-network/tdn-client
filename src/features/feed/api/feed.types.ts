import type { Comment } from "../../comment/api/comment.types";

export type PostType =
    | "COMMUNITY"
    | "TECH_NEWS"
    | "SYSTEM_UPDATE"
    | "JOB_POSTING";

export interface PostAuthor {
    id: string;
    username: string;
    fullName?: string;
    avatarUrl: string;
    isMe?: boolean;
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
}

export interface GetPostsParams {
    page?: number;
    limit?: number;
    type?: PostType;
}

export interface BookmarksResponse {
    posts: Post[];
    comments: Comment[];
}
