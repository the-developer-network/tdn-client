import { api } from "../../../core/api/client";
import type {
    Comment,
    CommentTarget,
    CreateCommentBody,
    GetCommentsParams,
} from "./comment.types";

/**
 * The collection a comment target owns. Only the two collection routes differ
 * between posts and articles; everything under `/comments/:id` is shared.
 */
const collectionPath = (target: CommentTarget): string =>
    target.type === "article"
        ? `/articles/${target.id}/comments`
        : `/posts/${target.id}/comments`;

export const commentApi = {
    createComment: (
        target: CommentTarget,
        body: CreateCommentBody,
    ): Promise<Comment> =>
        api.post<Comment>(collectionPath(target), {
            content: body.content,
            mediaUrls: body.mediaUrls ?? [],
            ...(body.parentId ? { parentId: body.parentId } : {}),
        }),

    getComments: (
        target: CommentTarget,
        params: GetCommentsParams = {},
        isPublic = true,
    ): Promise<Comment[]> => {
        const query = new URLSearchParams();
        query.set("page", String(params.page ?? 1));
        query.set("limit", String(params.limit ?? 20));
        return api.get<Comment[]>(
            `${collectionPath(target)}?${query.toString()}`,
            isPublic ? { isPublic: true } : undefined,
        );
    },

    likeComment: (commentId: string): Promise<void> =>
        api.post(`/comments/${commentId}/like`, {}),

    unlikeComment: (commentId: string): Promise<void> =>
        api.delete(`/comments/${commentId}/unlike`),

    saveComment: (commentId: string): Promise<void> =>
        api.post(`/comments/${commentId}/save`, {}),

    unsaveComment: (commentId: string): Promise<void> =>
        api.delete(`/comments/${commentId}/unsave`),
    getCommentById: (commentId: string, isPublic = true): Promise<Comment> =>
        api.get<Comment>(
            `/comments/${commentId}`,
            isPublic ? { isPublic: true } : undefined,
        ),
    getReplies: (
        commentId: string,
        params: GetCommentsParams = {},
        isPublic = true,
    ): Promise<Comment[]> => {
        const query = new URLSearchParams();
        query.set("page", String(params.page ?? 1));
        query.set("limit", String(params.limit ?? 20));
        return api.get<Comment[]>(
            `/comments/${commentId}/replies?${query.toString()}`,
            isPublic ? { isPublic: true } : undefined,
        );
    },
    deleteComment: (commentId: string): Promise<void> =>
        api.delete(`/comments/${commentId}`, { contentType: false }),
};
