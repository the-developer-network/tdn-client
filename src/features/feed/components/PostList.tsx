import { Fragment, useEffect, useRef } from "react";
import { PostCard } from "./PostCard";
import { AdPlaceholderCard } from "./AdPlaceholderCard";
import { Button } from "../../../shared/components/ui/Button";
import { useI18n } from "../../../shared/hooks/useI18n";
import type { Post } from "../api/feed.types";

const AD_INTERVAL = 5;

interface PostListProps {
    posts: Post[];
    isLoading: boolean;
    isLoadingMore: boolean;
    hasMore: boolean;
    error: string | null;
    loadMoreError?: string | null;
    onPostDeleted?: (postId: string) => void;
    onPostQuoted?: (post: Post) => void;
    /** Handed a re-read post when its pending video resolves. */
    onPostUpdated?: (post: Post) => void;
    /**
     * Overrides the feed's own "Category Empty". A list that is not the feed
     * — the quotes of one post, say — has its own way of being empty.
     */
    emptyMessage?: string;
    onLoadMore: () => void;
    onRetry?: () => void;
    onRetryLoadMore?: () => void;
}

export function PostList({
    posts,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMoreError,
    onPostDeleted,
    onPostQuoted,
    onPostUpdated,
    emptyMessage,
    onLoadMore,
    onRetry,
    onRetryLoadMore,
}: PostListProps) {
    const sentinelRef = useRef<HTMLDivElement>(null);
    const { t } = useI18n();

    useEffect(() => {
        if (isLoading || !hasMore || isLoadingMore) return;
        const sentinel = sentinelRef.current;
        if (!sentinel) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    onLoadMore();
                }
            },
            { threshold: 0.1 },
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [onLoadMore, isLoading, hasMore, isLoadingMore]);

    if (isLoading) {
        return (
            <div className="flex justify-center p-10">
                <div className="w-6 h-6 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-10 text-center flex flex-col items-center gap-4">
                <p className="text-red-400/60 text-sm">{error}</p>
                {onRetry && (
                    <Button variant="outline" size="sm" onClick={onRetry}>
                        {t("postList.tryAgain")}
                    </Button>
                )}
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="p-10 text-center text-ink/30 italic text-sm">
                {emptyMessage ?? t("postList.empty")}
            </div>
        );
    }

    const showAds = posts.length > AD_INTERVAL;

    return (
        <div className="flex flex-col">
            {posts.map((post, index) => (
                <Fragment key={post.id}>
                    <PostCard
                        {...post}
                        onDeleted={onPostDeleted}
                        onQuoted={onPostQuoted}
                        onUpdated={onPostUpdated}
                    />
                    {showAds && (index + 1) % AD_INTERVAL === 0 && (
                        <AdPlaceholderCard />
                    )}
                </Fragment>
            ))}
            <div ref={sentinelRef} className="h-1" />
            {loadMoreError && (
                <div className="flex flex-col items-center gap-3 p-6">
                    <p className="text-red-400/60 text-sm">{loadMoreError}</p>
                    {onRetryLoadMore && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onRetryLoadMore}
                        >
                            {t("postList.tryAgain")}
                        </Button>
                    )}
                </div>
            )}
            {isLoadingMore && (
                <div className="flex justify-center p-6">
                    <div className="w-5 h-5 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
                </div>
            )}
            {!hasMore && (
                <div className="p-6 text-center text-ink/20 text-xs">
                    {t("postList.noMore")}
                </div>
            )}
        </div>
    );
}
