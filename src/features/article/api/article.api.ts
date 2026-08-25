import { api } from "../../../core/api/client";
import type {
    Article,
    ArticleSummary,
    GetArticlesParams,
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
};
