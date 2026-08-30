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
        if (params.followedOnly) query.set("followedOnly", "true");
        if (params.categories?.length) {
            params.categories.forEach((cat) => query.append("categories", cat));
        }

        return api.get<Post[]>(`/posts?${query.toString()}`, {
            isPublic: !params.followedOnly,
        });
    },
    /**
     * `quotedPostId` turns this into a quote. It is omitted rather than sent
     * as `undefined` so an ordinary post posts exactly the body it used to,
     * and the server's "empty content is only allowed on a quote" rule is
     * never tripped by a key that is present but empty.
     */
    createPost: (
        content: string,
        type: PostType,
        mediaUrls: string[] = [],
        quotedPostId?: string,
    ): Promise<Post> =>
        api.post<Post>("/posts", {
            content,
            type,
            mediaUrls,
            ...(quotedPostId ? { quotedPostId } : {}),
        }),
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

    /**
     * The posts that quote `postId`, newest first. Every row is a full post
     * carrying its own `quotedPost` card, so `PostList` renders it unchanged.
     *
     * `isPublic` because the endpoint's auth is optional: a signed-out reader
     * gets the list with `isLiked`/`isBookmarked` false rather than a 401.
     */
    getQuotes: (
        postId: string,
        params: { page?: number; limit?: number } = {},
    ): Promise<Post[]> => {
        const query = new URLSearchParams();
        query.set("page", String(params.page ?? 1));
        query.set("limit", String(params.limit ?? 20));

        return api.get<Post[]>(`/posts/${postId}/quotes?${query.toString()}`, {
            isPublic: true,
        });
    },

    getPostById: (postId: string): Promise<Post> =>
        api.get<Post>(`/posts/${postId}`, { isPublic: true }),

    deletePost: (postId: string): Promise<void> =>
        api.delete(`/posts/${postId}`, { contentType: false }),
};
