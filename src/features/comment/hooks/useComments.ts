import { useState, useCallback } from "react";
import { commentApi } from "../api/comment.api";
import { useAuthStore } from "../../../core/auth/auth.store";
import { useI18n } from "../../../shared/hooks/useI18n";
import type { Comment } from "../api/comment.types";

export function useComments(postId: string) {
    const { t } = useI18n();
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
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
                postId,
                {},
                !isAuthenticated,
            );
            setComments(data);
        } catch {
            setError(t("commentList.error"));
        } finally {
            setIsLoading(false);
        }
    }, [postId, isAuthenticated, t]);

    const addComment = useCallback((comment: Comment) => {
        setComments((prev) => [comment, ...prev]);
    }, []);

    return {
        comments,
        isLoading,
        error,
        fetchComments,
        retry: fetchComments,
        addComment,
        removeComment,
    };
}
