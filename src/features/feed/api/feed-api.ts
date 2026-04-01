import { api } from "../../../core/api/client";
import type { GetPostsParams, Post } from "./feed.types";

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
};
