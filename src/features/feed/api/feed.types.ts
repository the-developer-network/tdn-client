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
}

export interface BookmarksResponse {
    posts: Post[];
    comments: Comment[];
}
