import { useState, useCallback, useRef } from "react";
import { articleApi } from "../api/article.api";
import { getErrorMessage } from "../../../shared/utils/error-handler";
import { assertList } from "../../../shared/utils/assert-list";
import type { ArticleSummary, GetArticlesParams } from "../api/article.types";

const PAGE_LIMIT = 20;

/**
 * A list the caller already has, handed back after a browser Back. Read only
 * by the state initialisers, so it is a mount-time decision.
 */
export interface ArticleRestore {
    articles: ArticleSummary[];
    page: number;
    hasMore: boolean;
    /** What page 1 was narrowed by, so `loadMore` can repeat it. */
    params: GetArticlesParams;
}

export function useArticles(restore?: ArticleRestore) {
    const [articles, setArticles] = useState<ArticleSummary[]>(
        restore?.articles ?? [],
    );
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(restore ? restore.hasMore : true);

    const pageRef = useRef(restore?.page ?? 1);
    // Mirrors the ref for the caller's benefit only; see `useFeed`.
    const [page, setPage] = useState(restore?.page ?? 1);
    const lastParamsRef = useRef<GetArticlesParams>(restore?.params ?? {});
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
            setPage(1);
            lastParamsRef.current = params;

            const requestId = ++requestIdRef.current;

            try {
                const data = await articleApi.getArticles({
                    ...params,
                    page: 1,
                    limit: PAGE_LIMIT,
                });
                if (requestId !== requestIdRef.current) return;
                // Before the first `set`, so a mis-shaped body fails as this
                // request rather than as a crash somewhere later.
                assertList(data);
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
            assertList(data);
            setArticles((prev) => [...prev, ...data]);
            setHasMore(data.length === PAGE_LIMIT);
            pageRef.current = nextPage;
            setPage(nextPage);
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
        // Not rendered from — it exists so the list can be snapshotted.
        page,
    };
}
