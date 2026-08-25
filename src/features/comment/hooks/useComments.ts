import { useState, useCallback, useMemo } from "react";
import { commentApi } from "../api/comment.api";
import { useAuthStore } from "../../../core/auth/auth.store";
import { getErrorMessage } from "../../../shared/utils/error-handler";
import type { Comment, CommentTarget } from "../api/comment.types";

const LIMIT = 20;

/**
 * Appends a page while dropping anything already on screen.
 *
 * The endpoint pages by a page number, and this list grows at the head when
 * the reader posts a comment. That shifts every server row down by one, so
 * page 2 comes back overlapping page 1 by exactly the number of comments
 * added since. Matching on id is what keeps a comment from appearing twice.
 */
function appendNewOnly(prev: Comment[], incoming: Comment[]): Comment[] {
    const seen = new Set(prev.map((comment) => comment.id));
    return [...prev, ...incoming.filter((comment) => !seen.has(comment.id))];
}

export function useComments(target: CommentTarget) {
    // Callers pass the target as an object literal, which is a fresh reference
    // on every render. Depending on it directly would rebuild `fetchComments`
    // each time, and the pages call that from an effect keyed on it — one
    // render would schedule the next, forever. Rebuilding from the two
    // primitives pins the identity to what actually identifies the target.
    const { type: targetType, id: targetId } = target;
    const stableTarget = useMemo<CommentTarget>(
        () =>
            targetType === "article"
                ? { type: "article", id: targetId }
                : { type: "post", id: targetId },
        [targetType, targetId],
    );

    const [comments, setComments] = useState<Comment[]>([]);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    const removeComment = useCallback((commentId: string) => {
        setComments((prev) =>
            prev.filter((comment) => comment.id !== commentId),
        );
    }, []);

    const fetchComments = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await commentApi.getComments(
                stableTarget,
                { page: 1, limit: LIMIT },
                !isAuthenticated,
            );
            setComments(data);
            // `meta` carries only the page and limit back, never a total, so a
            // full page is the only signal that there is another behind it.
            setHasMore(data.length === LIMIT);
            setPage(1);
        } catch (err) {
            setError(getErrorMessage(err));
            setHasMore(false);
        } finally {
            setIsLoading(false);
        }
    }, [stableTarget, isAuthenticated]);

    const loadMore = useCallback(async () => {
        if (isLoadingMore || !hasMore) return;
        setIsLoadingMore(true);
        const nextPage = page + 1;

        try {
            const data = await commentApi.getComments(
                stableTarget,
                { page: nextPage, limit: LIMIT },
                !isAuthenticated,
            );
            setComments((prev) => appendNewOnly(prev, data));
            setHasMore(data.length === LIMIT);
            setPage(nextPage);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoadingMore(false);
        }
    }, [stableTarget, isAuthenticated, page, hasMore, isLoadingMore]);

    const addComment = useCallback((comment: Comment) => {
        setComments((prev) => [comment, ...prev]);
    }, []);

    return {
        comments,
        isLoading,
        isLoadingMore,
        hasMore,
        error,
        fetchComments,
        retry: fetchComments,
        loadMore,
        addComment,
        removeComment,
    };
}
