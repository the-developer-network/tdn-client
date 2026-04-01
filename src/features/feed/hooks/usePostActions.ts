import { useState } from "react";
import { feedApi } from "../api/feed.api";
import { useAuthStore } from "../../../core/auth/auth.store";
import { useAuthModalStore } from "../../auth/store/auth-modal.store";

export function usePostActions(
    initialLiked: boolean,
    initialLikeCount: number,
    postId: string,
) {
    const [isLiked, setIsLiked] = useState(initialLiked);
    const [likeCount, setLikeCount] = useState(initialLikeCount);
    const [isLikeLoading, setIsLikeLoading] = useState(false);

    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const openModal = useAuthModalStore((state) => state.openModal);
    const setStep = useAuthModalStore((state) => state.setStep);

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
            if (prevLiked) {
                await feedApi.unlikePost(postId);
            } else {
                await feedApi.likePost(postId);
            }
        } catch {
            // Hata olursa geri al
            setIsLiked(prevLiked);
            setLikeCount(prevCount);
        } finally {
            setIsLikeLoading(false);
        }
    };

    return { isLiked, likeCount, isLikeLoading, handleLike };
}
