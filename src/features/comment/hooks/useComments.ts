import { useState, useCallback } from "react";
import { commentApi } from "../api/comment.api";
import type { Comment } from "../api/comment.types";

export function useComments(postId: string) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchComments = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await commentApi.getComments(postId);
            setComments(data);
        } catch {
            setError("Comments could not be loaded.");
        } finally {
            setIsLoading(false);
        }
    }, [postId]);

    const addComment = useCallback((comment: Comment) => {
        setComments((prev) => [comment, ...prev]);
    }, []);

    return { comments, isLoading, error, fetchComments, addComment };
}
