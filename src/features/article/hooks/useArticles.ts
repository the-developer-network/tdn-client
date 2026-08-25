import { useState, useCallback, useRef } from "react";
import { articleApi } from "../api/article.api";
import { getErrorMessage } from "../../../shared/utils/error-handler";
import type { ArticleSummary, GetArticlesParams } from "../api/article.types";

const PAGE_LIMIT = 20;

export function useArticles() {
    const [articles, setArticles] = useState<ArticleSummary[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);

    const pageRef = useRef(1);
    const lastParamsRef = useRef<GetArticlesParams>({});
    // Changing a filter leaves the previous request in flight. Only the newest
    // may write state, otherwise a slow earlier response lands last and shows
    // articles for a filter the reader has already changed.
    const requestIdRef = useRef(0);

    const fetchArticles = useCallback(
        async (params: GetArticlesParams = {}) => {
            setIsLoading(true);
            setError(null);
            setLoadMoreError(null);
            pageRef.current = 1;
            lastParamsRef.current = params;

            const requestId = ++requestIdRef.current;

            try {
                const data = await articleApi.getArticles({
                    ...params,
                    page: 1,
                    limit: PAGE_LIMIT,
                });
                if (requestId !== requestIdRef.current) return;
                setArticles(data);
                // The client unwraps `ApiResponse.data`, so `meta.totalPages` never
                // reaches here. A full page is the only signal another one exists.
                setHasMore(data.length === PAGE_LIMIT);
            } catch (err) {
                if (requestId !== requestIdRef.current) return;
                setError(getErrorMessage(err));
                setHasMore(false);
            } finally {
                if (requestId === requestIdRef.current) setIsLoading(false);
            }
        },
        [],
    );

    const loadMore = useCallback(async () => {
        if (isLoadingMore || !hasMore) return;
        setIsLoadingMore(true);
        setLoadMoreError(null);

        const nextPage = pageRef.current + 1;
        const requestId = requestIdRef.current;

        try {
            const data = await articleApi.getArticles({
                ...lastParamsRef.current,
                page: nextPage,
                limit: PAGE_LIMIT,
            });
            // A filter change during the request makes this page belong to a
            // list the reader has already left; appending would mix the two.
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
        fetchArticles(lastParamsRef.current);
    }, [fetchArticles]);

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
        fetchArticles,
        loadMore,
        retry,
        retryLoadMore,
    };
}
