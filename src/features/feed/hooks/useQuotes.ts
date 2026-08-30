import { useState, useCallback, useRef } from "react";
import { feedApi } from "../api/feed.api";
import { useI18n } from "../../../shared/hooks/useI18n";
import { assertList } from "../../../shared/utils/assert-list";
import type { Post } from "../api/feed.types";

const PAGE_LIMIT = 20;

/**
 * The posts quoting `postId`, newest first.
 *
 * `apiClient` unwraps `ApiResponse.data`, so the endpoint's `meta.totalPages`
 * never reaches a caller. Paging is therefore decided the way every other list
 * in the app decides it: a short page is the last page.
 */
export function useQuotes(postId: string | undefined) {
    const { t } = useI18n();
    const [quotes, setQuotes] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const pageRef = useRef(1);

    const fetchQuotes = useCallback(async () => {
        if (!postId) return;
        setIsLoading(true);
        setError(null);
        setLoadMoreError(null);
        pageRef.current = 1;

        try {
            const data = await feedApi.getQuotes(postId, {
                page: 1,
                limit: PAGE_LIMIT,
            });
            // Checked before the first `set`, so a mis-shaped payload fails
            // inside the request that caused it rather than on a later render.
            assertList(data);
            setQuotes(data);
            setHasMore(data.length === PAGE_LIMIT);
        } catch {
            // A deleted original answers 404 here. It reads as "this list
            // could not be loaded", which is exactly what it is — the page
            // never renders a tombstone for a post that no longer exists.
            setError(t("quoteList.error"));
        } finally {
            setIsLoading(false);
        }
    }, [postId, t]);

    const loadMore = useCallback(async () => {
        if (!postId || isLoadingMore || !hasMore) return;
        setIsLoadingMore(true);
        setLoadMoreError(null);
        const nextPage = pageRef.current + 1;

        try {
            const data = await feedApi.getQuotes(postId, {
                page: nextPage,
                limit: PAGE_LIMIT,
            });
            assertList(data);
            setQuotes((prev) => [...prev, ...data]);
            setHasMore(data.length === PAGE_LIMIT);
            // Advanced only once the page is in hand, or a failed page 2 would
            // be skipped and those quotes become unreachable.
            pageRef.current = nextPage;
        } catch {
            setLoadMoreError(t("quoteList.loadMoreError"));
        } finally {
            setIsLoadingMore(false);
        }
    }, [postId, isLoadingMore, hasMore, t]);

    const removeQuote = useCallback((quoteId: string) => {
        setQuotes((prev) => prev.filter((quote) => quote.id !== quoteId));
    }, []);

    const addQuote = useCallback((quote: Post) => {
        setQuotes((prev) => [quote, ...prev]);
    }, []);

    const retryLoadMore = useCallback(() => {
        setLoadMoreError(null);
        loadMore();
    }, [loadMore]);

    return {
        quotes,
        isLoading,
        isLoadingMore,
        error,
        loadMoreError,
        hasMore,
        fetchQuotes,
        loadMore,
        retry: fetchQuotes,
        retryLoadMore,
        addQuote,
        removeQuote,
    };
}
