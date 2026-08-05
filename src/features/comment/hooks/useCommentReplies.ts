import { useCallback, useState } from "react";
import { useAuthStore } from "../../../core/auth/auth.store";
import { commentApi } from "../api/comment.api";
import type { Comment } from "../api/comment.types";
import { getErrorMessage } from "../../../shared/utils/error-handler";

const LIMIT = 20;

/**
 * Appends a page while dropping anything already on screen — replies grow at
 * the head when the reader posts one, which shifts every server row down and
 * makes the next page overlap the one before it. See `useComments`.
 */
function appendNewOnly(prev: Comment[], incoming: Comment[]): Comment[] {
    const seen = new Set(prev.map((reply) => reply.id));
    return [...prev, ...incoming.filter((reply) => !seen.has(reply.id))];
}

export function useCommentReplies(commentId: string) {
    const [replies, setReplies] = useState<Comment[]>([]);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    const removeReply = useCallback((replyId: string) => {
        setReplies((prev) => prev.filter((reply) => reply.id !== replyId));
    }, []);

    const fetchReplies = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const data = await commentApi.getReplies(
                commentId,
                { page: 1, limit: LIMIT },
                !isAuthenticated,
            );
            setReplies(data);
            setHasMore(data.length === LIMIT);
            setPage(1);
        } catch (err) {
            setError(getErrorMessage(err));
            setHasMore(false);
        } finally {
            setIsLoading(false);
        }
    }, [commentId, isAuthenticated]);

    const loadMore = useCallback(async () => {
        if (isLoadingMore || !hasMore) return;
        setIsLoadingMore(true);
        const nextPage = page + 1;

        try {
            const data = await commentApi.getReplies(
                commentId,
                { page: nextPage, limit: LIMIT },
                !isAuthenticated,
            );
            setReplies((prev) => appendNewOnly(prev, data));
            setHasMore(data.length === LIMIT);
            setPage(nextPage);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoadingMore(false);
        }
    }, [commentId, isAuthenticated, page, hasMore, isLoadingMore]);

    const addReply = useCallback((reply: Comment) => {
        setReplies((prev) => [reply, ...prev]);
    }, []);

    return {
        replies,
        isLoading,
        isLoadingMore,
        hasMore,
        error,
        fetchReplies,
        loadMore,
        addReply,
        removeReply,
    };
}
