import { useCallback, useEffect, useState } from "react";
import { blockApi } from "../api/block.api";
import type { BlockedUser } from "../api/block.types";
import { getErrorMessage } from "../../../shared/utils/error-handler";

const LIMIT = 20;

/**
 * The accounts you have blocked.
 *
 * Paged by offset rather than a page counter, like the follow lists, and for
 * one more reason here: unblocking removes a row from the server's list too,
 * so both lists shrink together and `users.length` stays the correct offset
 * for the next page. A page counter would skip a row after every unblock.
 */
export function useBlockedList(enabled = true) {
    const [users, setUsers] = useState<BlockedUser[]>([]);
    const [hasFetched, setHasFetched] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    const isLoading = enabled && !hasFetched;

    useEffect(() => {
        if (!enabled) return;

        let cancelled = false;

        blockApi
            .getBlocked({ limit: LIMIT, offset: 0 })
            .then((data) => {
                if (cancelled) return;
                setUsers(data);
                // `meta.total` would answer this, but the client unwraps
                // `data` before we see it, so a full page is the only signal
                // that there is another one behind it.
                setHasMore(data.length === LIMIT);
                setError(null);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(getErrorMessage(err));
                setHasMore(false);
            })
            .finally(() => {
                if (!cancelled) setHasFetched(true);
            });

        return () => {
            cancelled = true;
        };
    }, [enabled, reloadKey]);

    const loadMore = useCallback(() => {
        if (isLoadingMore) return;
        setIsLoadingMore(true);

        blockApi
            .getBlocked({ limit: LIMIT, offset: users.length })
            .then((data) => {
                setUsers((prev) => [...prev, ...data]);
                setHasMore(data.length === LIMIT);
            })
            .catch((err) => setError(getErrorMessage(err)))
            .finally(() => setIsLoadingMore(false));
    }, [users.length, isLoadingMore]);

    const retry = useCallback(() => {
        setError(null);
        setHasFetched(false);
        setReloadKey((key) => key + 1);
    }, []);

    /**
     * Called after an unblock has been confirmed by the server, never before
     * it: the row is the only way back to this account, so taking it away on
     * a request that then fails would strand the block with nothing on screen
     * pointing at it.
     */
    const remove = useCallback((userId: string) => {
        setUsers((prev) => prev.filter((user) => user.userId !== userId));
    }, []);

    return {
        users,
        isLoading,
        isLoadingMore,
        error,
        hasMore,
        loadMore,
        retry,
        remove,
    };
}
