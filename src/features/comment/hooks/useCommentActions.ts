import { useState } from "react";
import { commentApi } from "../api/comment.api";
import { useAuthStore } from "../../../core/auth/auth.store";
import { useAuthModalStore } from "../../auth/store/auth-modal.store";
import { shareContent } from "../../../shared/utils/share";

export function useCommentActions(
    initialLiked: boolean,
    initialLikeCount: number,
    initialBookmarked: boolean,
    commentId: string,
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
            if (prevLiked) await commentApi.unlikeComment(commentId);
            else await commentApi.likeComment(commentId);
        } catch {
            setIsLiked(prevLiked);
            setLikeCount(prevCount);
        } finally {
            setIsLikeLoading(false);
        }
    };

    const handleSave = async (e: React.MouseEvent) => {
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
            if (prevBookmarked) await commentApi.unsaveComment(commentId);
            else await commentApi.saveComment(commentId);
        } catch {
            setIsBookmarked(prevBookmarked);
        } finally {
            setIsBookmarkLoading(false);
        }
    };

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const postUrl = `${window.location.origin}/comments/${commentId}`;
        const result = await shareContent({
            title: "Comment",
            text: "Check out this comment!",
            url: postUrl,
        });
        if (result === "copied") {
            alert("The link has been copied to the clipboard!");
        }
    };
    return {
        isLiked,
        likeCount,
        isLikeLoading,
        handleLike,
        isBookmarked,
        isBookmarkLoading,
        handleSave,
        handleShare,
    };
}
