import { useState } from "react";
import { articleApi } from "../api/article.api";
import { useAuthStore } from "../../../core/auth/auth.store";
import { useAuthModalStore } from "../../auth/store/auth-modal.store";
import { shareContent } from "../../../shared/utils/share";
import { getErrorMessage } from "../../../shared/utils/error-handler";
import { useToastStore } from "../../../shared/store/toast.store";
import { useI18n } from "../../../shared/hooks/useI18n";

/**
 * Like and bookmark are applied optimistically because the endpoints answer
 * with `{ meta }` alone — no updated counter comes back, and re-reading the
 * article is no help either since list responses sit in a 60 s cache.
 */
export function useArticleActions(
    articleId: string,
    slug: string,
    initialLiked: boolean,
    initialLikeCount: number,
    initialBookmarked: boolean,
    title?: string,
) {
    const { t } = useI18n();
    const [isLiked, setIsLiked] = useState(initialLiked);
    const [likeCount, setLikeCount] = useState(initialLikeCount);
    const [isLikeLoading, setIsLikeLoading] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
    const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);

    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const { openModal } = useAuthModalStore();
    const addToast = useToastStore((state) => state.addToast);

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isAuthenticated) {
            openModal();
            return;
        }
        if (isLikeLoading) return;

        const prevLiked = isLiked;
        const prevCount = likeCount;
        setIsLiked(!prevLiked);
        setLikeCount(prevLiked ? prevCount - 1 : prevCount + 1);
        setIsLikeLoading(true);

        try {
            if (prevLiked) await articleApi.unlikeArticle(articleId);
            else await articleApi.likeArticle(articleId);
        } catch (err) {
            setIsLiked(prevLiked);
            setLikeCount(prevCount);
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
        setIsBookmarkLoading(true);

        try {
            if (prevBookmarked) await articleApi.unbookmarkArticle(articleId);
            else await articleApi.bookmarkArticle(articleId);
        } catch (err) {
            setIsBookmarked(prevBookmarked);
            addToast({ type: "error", message: getErrorMessage(err) });
        } finally {
            setIsBookmarkLoading(false);
        }
    };

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();

        const result = await shareContent({
            title: title || t("page.article"),
            text: t("article.shareText"),
            url: `${window.location.origin}/articles/${slug}`,
        });

        if (result === "copied") {
            addToast({ type: "info", message: t("common.linkCopied") });
        } else if (result === "error") {
            addToast({ type: "error", message: t("common.shareFailed") });
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
    };
}
