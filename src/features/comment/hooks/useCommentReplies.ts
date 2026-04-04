import { useCallback, useState } from "react";
import { useAuthStore } from "../../../core/auth/auth.store";
import { commentApi } from "../api/comment.api";
import type { Comment } from "../api/comment.types";
import { getErrorMessage } from "../../../shared/utils/error-handler";

export function useCommentReplies(commentId: string) {
    const [replies, setReplies] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    const fetchReplies = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const data = await commentApi.getReplies(
                commentId,
                { page: 1, limit: 20 },
                !isAuthenticated,
            );
            setReplies(data);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    }, [commentId, isAuthenticated]);

    const addReply = useCallback((reply: Comment) => {
        setReplies((prev) => [reply, ...prev]);
    }, []);

    return { replies, isLoading, error, fetchReplies, addReply };
}
