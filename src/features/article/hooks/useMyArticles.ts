import { useState, useCallback, useRef } from "react";
import { articleApi } from "../api/article.api";
import { getErrorMessage } from "../../../shared/utils/error-handler";
import type { ArticleStatus, ArticleSummary } from "../api/article.types";

const PAGE_LIMIT = 20;

/**
 * The author's own articles. Separate from `useArticles` because the endpoint
 * is a different one: `/articles/me` takes the author from the token and is
 * the only way a draft is visible at all.
 */
export function useMyArticles() {
    const [articles, setArticles] = useState<ArticleSummary[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);

    const pageRef = useRef(1);
    const statusRef = useRef<ArticleStatus | undefined>(undefined);
    // Switching status tabs leaves the previous request in flight; only the
    // newest may write, or a slow earlier one lands last and shows drafts
    // under the published tab.
    const requestIdRef = useRef(0);

    const fetchMine = useCallback(async (status?: ArticleStatus) => {
        setIsLoading(true);
        setError(null);
        setLoadMoreError(null);
        pageRef.current = 1;
        statusRef.current = status;

        const requestId = ++requestIdRef.current;

        try {
            const data = await articleApi.getMyArticles({
                status,
                page: 1,
                limit: PAGE_LIMIT,
            });
            if (requestId !== requestIdRef.current) return;
            setArticles(data);
            setHasMore(data.length === PAGE_LIMIT);
        } catch (err) {
            if (requestId !== requestIdRef.current) return;
            setError(getErrorMessage(err));
            setHasMore(false);
        } finally {
            if (requestId === requestIdRef.current) setIsLoading(false);
        }
    }, []);

    const loadMore = useCallback(async () => {
        if (isLoadingMore || !hasMore) return;
        setIsLoadingMore(true);
        setLoadMoreError(null);

        const nextPage = pageRef.current + 1;
        const requestId = requestIdRef.current;

        try {
            const data = await articleApi.getMyArticles({
                status: statusRef.current,
                page: nextPage,
                limit: PAGE_LIMIT,
            });
            if (requestId !== requestIdRef.current) return;
            setArticles((prev) => [...prev, ...data]);
            setHasMore(data.length === PAGE_LIMIT);
            pageRef.current = nextPage;
        } catch (err) {
            if (requestId !== requestIdRef.current) return;
            setLoadMoreError(getErrorMessage(err));
        } finally {
            setIsLoadingMore(false);
        }
    }, [isLoadingMore, hasMore]);

    const retry = useCallback(() => {
        fetchMine(statusRef.current);
    }, [fetchMine]);

    const retryLoadMore = useCallback(() => {
        setLoadMoreError(null);
        loadMore();
    }, [loadMore]);

    return {
        articles,
        isLoading,
        isLoadingMore,
        error,
        loadMoreError,
        hasMore,
        fetchMine,
        loadMore,
        retry,
        retryLoadMore,
    };
}
