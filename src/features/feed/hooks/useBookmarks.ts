import { useState, useCallback, useEffect } from "react";
import { feedApi } from "../api/feed.api";
import { getErrorMessage } from "../../../shared/utils/error-handler";
import type { Post } from "../api/feed.types";
import type { Comment } from "../../comment/api/comment.types";

const LIMIT = 20;

export function useBookmarks() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [comments, setComments] = useState<Comment[]>([]);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // The endpoint pages posts and comments together and reports their totals
    // in `meta`, which `apiClient` strips along with the rest of the envelope.
    // A full page of either is the only signal left that there is more behind.
    const fetchFirstPage = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await feedApi.getBookmarks({ page: 1, limit: LIMIT });
            setPosts(data.posts);
            setComments(data.comments);
            setHasMore(
                data.posts.length === LIMIT || data.comments.length === LIMIT,
            );
            setPage(1);
        } catch (err) {
            setError(getErrorMessage(err));
            setHasMore(false);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        feedApi
            .getBookmarks({ page: 1, limit: LIMIT })
            .then((data) => {
                if (cancelled) return;
                setPosts(data.posts);
                setComments(data.comments);
                setHasMore(
                    data.posts.length === LIMIT ||
                        data.comments.length === LIMIT,
                );
                setPage(1);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(getErrorMessage(err));
                setHasMore(false);
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const loadMore = useCallback(() => {
        if (isLoadingMore) return;
        const nextPage = page + 1;
        setIsLoadingMore(true);

        feedApi
            .getBookmarks({ page: nextPage, limit: LIMIT })
            .then((data) => {
                setPosts((prev) => [...prev, ...data.posts]);
                setComments((prev) => [...prev, ...data.comments]);
                setHasMore(
                    data.posts.length === LIMIT ||
                        data.comments.length === LIMIT,
                );
                setPage(nextPage);
            })
            .catch((err) => setError(getErrorMessage(err)))
            .finally(() => setIsLoadingMore(false));
    }, [page, isLoadingMore]);

    const removePost = useCallback((postId: string) => {
        setPosts((prev) => prev.filter((post) => post.id !== postId));
    }, []);

    return {
        posts,
        comments,
        isLoading,
        isLoadingMore,
        hasMore,
        error,
        fetchBookmarks: fetchFirstPage,
        retry: fetchFirstPage,
        loadMore,
        removePost,
    };
}
