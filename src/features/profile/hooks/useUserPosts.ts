import { useState, useEffect, useCallback, useRef } from "react";
import { profileApi } from "../api/profile.api";
import type { Post } from "../../feed/api/feed.types";
import { getErrorMessage } from "../../../shared/utils/error-handler";

const LIMIT = 20;

export function useUserPosts(username: string) {
    const [posts, setPosts] = useState<Post[]>([]);
    const [page, setPage] = useState(1);
    // Track the "fetch key" that was last completed; isLoading is derived from it
    const [fetchedKey, setFetchedKey] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const retryCountRef = useRef(0);
    const [retryTick, setRetryTick] = useState(0);

    const currentKey = `${username}::${retryTick}`;
    const isLoading = fetchedKey !== currentKey && !isLoadingMore;

    useEffect(() => {
        let cancelled = false;

        profileApi
            .getUserPosts(username, { page: 1, limit: LIMIT })
            .then((data) => {
                if (cancelled) return;
                setPosts(data);
                setHasMore(data.length === LIMIT);
                setPage(1);
                setError(null);
                setFetchedKey(currentKey);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(getErrorMessage(err));
                setFetchedKey(currentKey);
            });

        return () => {
            cancelled = true;
        };
        // currentKey encodes both username and retryTick — safe to use as dep
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentKey]);

    const loadMore = useCallback(() => {
        const nextPage = page + 1;
        setIsLoadingMore(true);

        profileApi
            .getUserPosts(username, { page: nextPage, limit: LIMIT })
            .then((data) => {
                setPosts((prev) => [...prev, ...data]);
                setHasMore(data.length === LIMIT);
                setPage(nextPage);
            })
            .catch((err) => setError(getErrorMessage(err)))
            .finally(() => setIsLoadingMore(false));
    }, [username, page]);

    const retry = useCallback(() => {
        retryCountRef.current += 1;
        setRetryTick(retryCountRef.current);
    }, []);

    const removePost = useCallback((postId: string) => {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
    }, []);

    return {
        posts,
        isLoading,
        isLoadingMore,
        error,
        hasMore,
        loadMore,
        retry,
        removePost,
    };
}
