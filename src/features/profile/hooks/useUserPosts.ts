import { useState, useEffect, useCallback } from "react";
import { profileApi } from "../api/profile.api";
import type { Post } from "../../feed/api/feed.types";
import { getErrorMessage } from "../../../shared/utils/error-handler";

const LIMIT = 20;

export function useUserPosts(username: string) {
    const [posts, setPosts] = useState<Post[]>([]);
    const [page, setPage] = useState(1);
    const [fetchedUsername, setFetchedUsername] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // Derived: initial load is pending until we've fetched for this username
    const isLoading = fetchedUsername !== username && !isLoadingMore;

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
                setFetchedUsername(username);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(getErrorMessage(err));
                setFetchedUsername(username);
            });

        return () => {
            cancelled = true;
        };
    }, [username]);

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
        removePost,
    };
}
