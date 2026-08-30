import { useState } from "react";
import { feedApi } from "../api/feed.api";
import { useAuthStore } from "../../../core/auth/auth.store";
import { useAuthModalStore } from "../../auth/store/auth-modal.store";
import { useFeedSnapshotStore } from "../store/feed-snapshot.store";
import { shareContent } from "../../../shared/utils/share";
import { getErrorMessage } from "../../../shared/utils/error-handler";
import { useToastStore } from "../../../shared/store/toast.store";
import { useI18n } from "../../../shared/hooks/useI18n";

export function usePostActions(
    initialLiked: boolean,
    initialLikeCount: number,
    initialBookmarked: boolean,
    postId: string,
    postTitle?: string,
    onDeleteSuccess?: () => void,
) {
    const { t } = useI18n();
    const [isLiked, setIsLiked] = useState(initialLiked);
    const [likeCount, setLikeCount] = useState(initialLikeCount);
    const [isLikeLoading, setIsLikeLoading] = useState(false);

    const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
    const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);
    const [isDeleteLoading, setIsDeleteLoading] = useState(false);

    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const { openModal } = useAuthModalStore();
    const addToast = useToastStore((state) => state.addToast);
    /**
     * The feed the reader will come back to no longer refetches, so a like made
     * on the post's own page has to be written into the list it left behind as
     * well as into this component. A no-op for a post no snapshot holds.
     */
    const patchPost = useFeedSnapshotStore((state) => state.patchPost);

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isAuthenticated) {
            openModal();
            return;
        }
        if (isLikeLoading) return;

        const prevLiked = isLiked;
        const prevCount = likeCount;
        const nextLiked = !prevLiked;
        const nextCount = prevLiked ? prevCount - 1 : prevCount + 1;
        setIsLiked(nextLiked);
        setLikeCount(nextCount);
        patchPost(postId, { isLiked: nextLiked, likeCount: nextCount });
        setIsLikeLoading(true);

        try {
            if (prevLiked) await feedApi.unlikePost(postId);
            else await feedApi.likePost(postId);
        } catch (err) {
            setIsLiked(prevLiked);
            setLikeCount(prevCount);
            patchPost(postId, { isLiked: prevLiked, likeCount: prevCount });
            addToast({ type: "error", message: getErrorMessage(err) });
        } finally {
            setIsLikeLoading(false);
        }
    };

    const handleBookmark = async (e: React.MouseEvent) => {
        e.stopPropagation();

        if (!isAuthenticated) {
            openModal();
            return;
        }
        if (isBookmarkLoading) return;

        const prevBookmarked = isBookmarked;
        setIsBookmarked(!prevBookmarked);
        patchPost(postId, { isBookmarked: !prevBookmarked });
        setIsBookmarkLoading(true);

        try {
            if (prevBookmarked) await feedApi.unsavePost(postId);
            else await feedApi.savePost(postId);
        } catch (err) {
            setIsBookmarked(prevBookmarked);
            patchPost(postId, { isBookmarked: prevBookmarked });
            addToast({ type: "error", message: getErrorMessage(err) });
        } finally {
            setIsBookmarkLoading(false);
        }
    };

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();

        const postUrl = `${window.location.origin}/post/${postId}`;

        const result = await shareContent({
            title: postTitle || t("page.post"),
            text: t("post.shareText"),
            url: postUrl,
        });

        if (result === "copied") {
            addToast({ type: "info", message: t("common.linkCopied") });
        } else if (result === "error") {
            addToast({ type: "error", message: t("common.shareFailed") });
        }
    };

    const handleDelete = async () => {
        if (!isAuthenticated) {
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
            addToast({ type: "error", message: getErrorMessage(err) });
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
