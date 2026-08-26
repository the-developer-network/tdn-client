import { api } from "../../../core/api/client";
import type {
    Article,
    ArticleSummary,
    CoverUploadResponse,
    CreateArticleBody,
    GetArticlesParams,
    GetMyArticlesParams,
    UpdateArticleBody,
} from "./article.types";

/**
 * Note the un-like and un-bookmark paths: articles answer `DELETE
 * /articles/:id/like`, where posts answer `DELETE /posts/:id/unlike`. Copying
 * `feedApi` verbatim produces a 404 on every undo.
 */
export const articleApi = {
    getArticles: (
        params: GetArticlesParams = {},
    ): Promise<ArticleSummary[]> => {
        const query = new URLSearchParams();
        query.set("page", String(params.page ?? 1));
        query.set("limit", String(params.limit ?? 20));
        if (params.tag) query.set("tag", params.tag);
        if (params.authorUsername)
            query.set("authorUsername", params.authorUsername);
        if (params.followedOnly) query.set("followedOnly", "true");
        if (params.categories?.length) {
            params.categories.forEach((cat) => query.append("categories", cat));
        }

        return api.get<ArticleSummary[]>(`/articles?${query.toString()}`, {
            isPublic: !params.followedOnly,
        });
    },

    /**
     * Reads by slug, not id — and a draft belonging to someone else answers 404
     * rather than 403, so a failure here is an ordinary not-found, never a
     * "this exists but is unpublished".
     */
    getArticleBySlug: (slug: string): Promise<Article> =>
        api.get<Article>(`/articles/${encodeURIComponent(slug)}`, {
            isPublic: true,
        }),

    likeArticle: (articleId: string): Promise<void> =>
        api.post(`/articles/${articleId}/like`, {}),

    unlikeArticle: (articleId: string): Promise<void> =>
        api.delete(`/articles/${articleId}/like`, { contentType: false }),

    bookmarkArticle: (articleId: string): Promise<void> =>
        api.post(`/articles/${articleId}/bookmark`, {}),

    unbookmarkArticle: (articleId: string): Promise<void> =>
        api.delete(`/articles/${articleId}/bookmark`, { contentType: false }),

    /**
     * The author's own articles, drafts included. `authorId` comes from the
     * token and cannot be passed, so this is the only way to see a draft.
     */
    getMyArticles: (
        params: GetMyArticlesParams = {},
    ): Promise<ArticleSummary[]> => {
        const query = new URLSearchParams();
        query.set("page", String(params.page ?? 1));
        query.set("limit", String(params.limit ?? 20));
        if (params.status) query.set("status", params.status);

        return api.get<ArticleSummary[]>(`/articles/me?${query.toString()}`);
    },

    /** Creates a DRAFT. Nothing is published until `publishArticle` runs. */
    createArticle: (body: CreateArticleBody): Promise<Article> =>
        api.post<Article>("/articles", body),

    updateArticle: (
        articleId: string,
        body: UpdateArticleBody,
    ): Promise<Article> => api.patch<Article>(`/articles/${articleId}`, body),

    publishArticle: (articleId: string): Promise<Article> =>
        api.post<Article>(`/articles/${articleId}/publish`, {}),

    archiveArticle: (articleId: string): Promise<Article> =>
        api.post<Article>(`/articles/${articleId}/archive`, {}),

    deleteArticle: (articleId: string): Promise<void> =>
        api.delete(`/articles/${articleId}`, { contentType: false }),

    /**
     * Two-step: the file goes up on its own and the key it returns is what
     * the article carries. Rate limited to 5 a minute, so this must run at
     * save or publish — uploading on every file pick spends the budget in
     * three tries.
     *
     * The field name is free but the count is not: exactly one file.
     */
    uploadCover: (file: File): Promise<CoverUploadResponse> => {
        const formData = new FormData();
        formData.append("file", file);

        return api.post<CoverUploadResponse>("/articles/cover", formData, {
            contentType: false,
        });
    },
};
