import type { Comment } from "../api/comment.types";
import { CommentCard } from "./CommentCard";
import { Button } from "../../../shared/components/ui/Button";
import { useI18n } from "../../../shared/hooks/useI18n";

interface CommentListProps {
    comments: Comment[];
    isLoading: boolean;
    error: string | null;
    onCommentDeleted?: (commentId: string) => void;
    onRetry?: () => void;
    // Optional so the bookmarks page, whose comments arrive through the post
    // list's own paging, can keep rendering a plain list.
    hasMore?: boolean;
    isLoadingMore?: boolean;
    onLoadMore?: () => void;
}

export function CommentList({
    comments,
    isLoading,
    error,
    onCommentDeleted,
    onRetry,
    hasMore = false,
    isLoadingMore = false,
    onLoadMore,
}: CommentListProps) {
    const { t } = useI18n();

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <div className="w-6 h-6 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center flex flex-col items-center gap-4">
                <p className="text-red-400/60 text-sm">{error}</p>
                {onRetry && (
                    <Button variant="outline" size="sm" onClick={onRetry}>
                        {t("commentList.tryAgain")}
                    </Button>
                )}
            </div>
        );
    }

    if (comments.length === 0) {
        return (
            <div className="p-8 text-center text-ink/30 text-sm">
                {t("commentList.empty")}
            </div>
        );
    }

    return (
        <div>
            {comments.map((comment) => (
                <CommentCard
                    key={comment.id}
                    comment={comment}
                    onDeleted={onCommentDeleted}
                />
            ))}

            {hasMore && !isLoadingMore && onLoadMore && (
                <div className="flex justify-center py-4">
                    <Button variant="outline" size="sm" onClick={onLoadMore}>
                        {t("common.loadMore")}
                    </Button>
                </div>
            )}

            {isLoadingMore && (
                <div className="flex justify-center py-4">
                    <div className="w-5 h-5 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
                </div>
            )}
        </div>
    );
}
