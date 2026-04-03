import { useState } from "react";
import { commentApi } from "../api/comment.api";
import { useAuthStore } from "../../../core/auth/auth.store";
import { useAuthModalStore } from "../../auth/store/auth-modal.store";

export function useCommentActions(
    initialLiked: boolean,
    initialLikeCount: number,
    commentId: string,
) {
    const [isLiked, setIsLiked] = useState(initialLiked);
    const [likeCount, setLikeCount] = useState(initialLikeCount);
    const [isLikeLoading, setIsLikeLoading] = useState(false);

    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const { openModal, setStep } = useAuthModalStore();

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isAuthenticated) {
            setStep("login");
            openModal();
            return;
        }
        if (isLikeLoading) return;

        const prevLiked = isLiked;
        const prevCount = likeCount;
        setIsLiked(!isLiked);
        setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
        setIsLikeLoading(true);

        try {
            if (prevLiked) await commentApi.unlikeComment(commentId);
            else await commentApi.likeComment(commentId);
        } catch {
            setIsLiked(prevLiked);
            setLikeCount(prevCount);
        } finally {
            setIsLikeLoading(false);
        }
    };

    return { isLiked, likeCount, isLikeLoading, handleLike };
}
