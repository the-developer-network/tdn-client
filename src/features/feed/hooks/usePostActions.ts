import { useState } from "react";
import { feedApi } from "../api/feed.api";
import { useAuthStore } from "../../../core/auth/auth.store";
import { useAuthModalStore } from "../../auth/store/auth-modal.store";

export function usePostActions(
    initialLiked: boolean,
    initialLikeCount: number,
    initialBookmarked: boolean,
    postId: string,
) {
    const [isLiked, setIsLiked] = useState(initialLiked);
    const [likeCount, setLikeCount] = useState(initialLikeCount);
    const [isLikeLoading, setIsLikeLoading] = useState(false);

    const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
    const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);

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
            if (prevLiked) await feedApi.unlikePost(postId);
            else await feedApi.likePost(postId);
        } catch {
            setIsLiked(prevLiked);
            setLikeCount(prevCount);
        } finally {
            setIsLikeLoading(false);
        }
    };

    const handleBookmark = async (e: React.MouseEvent) => {
        e.stopPropagation();

        if (!isAuthenticated) {
            setStep("login");
            openModal();
            return;
        }
        if (isBookmarkLoading) return;

        const prevBookmarked = isBookmarked;
        setIsBookmarked(!isBookmarked);
        setIsBookmarkLoading(true);

        try {
            if (prevBookmarked) await feedApi.unsavePost(postId);
            else await feedApi.savePost(postId);
        } catch {
            setIsBookmarked(prevBookmarked);
        } finally {
            setIsBookmarkLoading(false);
        }
    };

    return {
        isLiked,
        likeCount,
        isLikeLoading,
        handleLike,
        isBookmarked,
        isBookmarkLoading,
        handleBookmark,
    };
}
