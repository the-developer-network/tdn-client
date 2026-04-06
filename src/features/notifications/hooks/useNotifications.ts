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
            } catch (err) {
                setError(getErrorMessage(err));
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
        const nextPage = page + 1;
        setPage(nextPage);
        await fetchPage(nextPage, true);
        setIsLoadingMore(false);
    }, [isLoadingMore, hasMore, page, fetchPage]);

    return { fetch, isLoading, isLoadingMore, error, hasMore, loadMore };
}
