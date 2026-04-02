import { api } from "../../../core/api/client";
import type {
    Comment,
    CreateCommentBody,
    GetCommentsParams,
} from "./comment.types";

export const commentApi = {
    createComment: (
        postId: string,
        body: CreateCommentBody,
    ): Promise<Comment> =>
        api.post<Comment>(`/posts/${postId}/comments`, {
            content: body.content,
            mediaUrls: body.mediaUrls ?? [],
            ...(body.parentId ? { parentId: body.parentId } : {}),
        }),

    getComments: (
        postId: string,
        params: GetCommentsParams = {},
    ): Promise<Comment[]> => {
        const query = new URLSearchParams();
        query.set("page", String(params.page ?? 1));
        query.set("limit", String(params.limit ?? 20));
        return api.get<Comment[]>(
            `/posts/${postId}/comments?${query.toString()}`,
            { isPublic: true },
        );
    },

    likeComment: (commentId: string): Promise<void> =>
        api.post(`/comments/${commentId}/like`, {}),

    unlikeComment: (commentId: string): Promise<void> =>
        api.delete(`/comments/${commentId}/unlike`),
};
