import { api } from "../../../core/api/client";
import type {
    GetPostsParams,
    Post,
    PostType,
    BookmarksResponse,
} from "./feed.types";

export const feedApi = {
    getPosts: (params: GetPostsParams = {}): Promise<Post[]> => {
        const query = new URLSearchParams();
        query.set("page", String(params.page ?? 1));
        query.set("limit", String(params.limit ?? 20));
        if (params.type) query.set("type", params.type);
        if (params.tag) query.set("tag", params.tag);

        return api.get<Post[]>(`/posts?${query.toString()}`, {
            isPublic: true,
        });
    },
    createPost: (
        content: string,
        type: PostType,
        mediaUrls: string[] = [],
    ): Promise<Post> => api.post<Post>("/posts", { content, type, mediaUrls }),
    uploadMedia: (files: File[]): Promise<{ mediaUrls: string[] }> => {
        const formData = new FormData();
        files.forEach((file) => formData.append("files", file));

        return api.post<{ mediaUrls: string[] }>("/media", formData, {
            contentType: false,
        });
    },
    likePost: (postId: string): Promise<void> =>
        api.post(`/posts/${postId}/like`, {}, { contentType: true }),

    unlikePost: (postId: string): Promise<void> =>
        api.delete(`/posts/${postId}/unlike`, { contentType: false }),

    savePost: (postId: string): Promise<void> =>
        api.post(`/posts/${postId}/save`),

    unsavePost: (postId: string): Promise<void> =>
        api.delete(`/posts/${postId}/unsave`, { contentType: false }),

    getBookmarks: (
        params: { page?: number; limit?: number } = {},
    ): Promise<BookmarksResponse> => {
        const query = new URLSearchParams();
        query.set("page", String(params.page ?? 1));
        query.set("limit", String(params.limit ?? 20));

        return api.get<BookmarksResponse>(
            `/posts/bookmarks?${query.toString()}`,
        );
    },

    getPostById: (postId: string): Promise<Post> =>
        api.get<Post>(`/posts/${postId}`, { isPublic: true }),

    deletePost: (postId: string): Promise<void> =>
        api.delete(`/posts/${postId}`, { contentType: false }),
};
