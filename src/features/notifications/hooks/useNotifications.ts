import { useState, useCallback } from "react";
import { notificationApi } from "../api/notification.api";
import { useNotificationStore } from "../store/notification.store";
import { getErrorMessage } from "../../../shared/utils/error-handler";

const PAGE_LIMIT = 20;

export function useNotifications() {
    const { setNotifications } = useNotificationStore();
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);

    const fetchPage = useCallback(
        async (pageNum: number, append: boolean) => {
            try {
                const data = await notificationApi.getNotifications(
                    pageNum,
                    PAGE_LIMIT,
                );
                setNotifications(data, append);
                setHasMore(data.length === PAGE_LIMIT);
                return true;
            } catch (err) {
                setError(getErrorMessage(err));
                return false;
            }
        },
        [setNotifications],
    );

    const fetch = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setPage(1);
        await fetchPage(1, false);
        setIsLoading(false);
    }, [fetchPage]);

    const loadMore = useCallback(async () => {
        if (isLoadingMore || !hasMore) return;
        setIsLoadingMore(true);
        setError(null);
        const nextPage = page + 1;

        // The counter only moves once the page is actually in hand. Advancing
        // it first meant a failed page 2 was never retried — the next attempt
        // asked for page 3 and those notifications became unreachable.
        if (await fetchPage(nextPage, true)) {
            setPage(nextPage);
        }
        setIsLoadingMore(false);
    }, [isLoadingMore, hasMore, page, fetchPage]);

    return { fetch, isLoading, isLoadingMore, error, hasMore, loadMore };
}
