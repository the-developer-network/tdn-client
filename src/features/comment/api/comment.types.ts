export interface CommentAuthor {
    id: string;
    username: string;
    fullName?: string;
    avatarUrl: string;
}

export interface Comment {
    id: string;
    content: string;
    mediaUrls: string[];
    createdAt: string;
    likeCount: number;
    isLiked: boolean;
    isBookmarked: boolean;
    author: CommentAuthor;
    parentId: string | null;
    postId: string;
}

export interface CreateCommentBody {
    content: string;
    parentId?: string;
    mediaUrls?: string[];
}

export interface GetCommentsParams {
    page?: number;
    limit?: number;
}
