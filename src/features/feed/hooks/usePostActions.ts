import { useState } from "react";
import { feedApi } from "../api/feed.api";
import { useAuthStore } from "../../../core/auth/auth.store";
import { useAuthModalStore } from "../../auth/store/auth-modal.store";
import { shareContent } from "../../../shared/utils/share";
import { getErrorMessage } from "../../../shared/utils/error-handler";

export function usePostActions(
    initialLiked: boolean,
    initialLikeCount: number,
    initialBookmarked: boolean,
    postId: string,
    postTitle?: string,
    onDeleteSuccess?: () => void,
) {
    const [isLiked, setIsLiked] = useState(initialLiked);
    const [likeCount, setLikeCount] = useState(initialLikeCount);
    const [isLikeLoading, setIsLikeLoading] = useState(false);

    const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
    const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);
    const [isDeleteLoading, setIsDeleteLoading] = useState(false);

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

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();

        const postUrl = `${window.location.origin}/post/${postId}`;

        const result = await shareContent({
            title: postTitle || "Post",
            text: "You should check out this post!",
            url: postUrl,
        });

        if (result === "copied") {
            alert("The link has been copied to the clipboard!");
        }
    };

    const handleDelete = async () => {
        if (!isAuthenticated) {
            setStep("login");
            openModal();
            return false;
        }

        if (isDeleteLoading) return false;

        setIsDeleteLoading(true);

        try {
            await feedApi.deletePost(postId);
            onDeleteSuccess?.();
            return true;
        } catch (err) {
            alert(getErrorMessage(err));
            return false;
        } finally {
            setIsDeleteLoading(false);
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
        handleShare,
        isDeleteLoading,
        handleDelete,
    };
}
