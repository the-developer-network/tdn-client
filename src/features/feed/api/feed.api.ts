import { api } from "../../../core/api/client";
import type { GetPostsParams, Post, PostType } from "./feed.types";

export const feedApi = {
    getPosts: (params: GetPostsParams = {}): Promise<Post[]> => {
        const query = new URLSearchParams();
        query.set("page", String(params.page ?? 1));
        query.set("limit", String(params.limit ?? 20));
        if (params.type) query.set("type", params.type);

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
};
