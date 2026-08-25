import { useEffect, useRef } from "react";
import { ArticleCard } from "./ArticleCard";
import { Button } from "../../../shared/components/ui/Button";
import { useI18n } from "../../../shared/hooks/useI18n";
import type { ArticleSummary } from "../api/article.types";

interface ArticleListProps {
    articles: ArticleSummary[];
    isLoading: boolean;
    isLoadingMore: boolean;
    hasMore: boolean;
    error: string | null;
    loadMoreError?: string | null;
    onLoadMore: () => void;
    onRetry?: () => void;
    onRetryLoadMore?: () => void;
}

export function ArticleList({
    articles,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMoreError,
    onLoadMore,
    onRetry,
    onRetryLoadMore,
}: ArticleListProps) {
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
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-10 text-center flex flex-col items-center gap-4">
                <p className="text-red-400/60 text-sm">{error}</p>
                {onRetry && (
                    <Button variant="outline" size="sm" onClick={onRetry}>
                        {t("articleList.tryAgain")}
                    </Button>
                )}
            </div>
        );
    }

    if (articles.length === 0) {
        return (
            <div className="p-10 text-center text-white/30 italic text-sm">
                {t("articleList.empty")}
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            {articles.map((article) => (
                <ArticleCard key={article.id} {...article} />
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
                            {t("articleList.tryAgain")}
                        </Button>
                    )}
                </div>
            )}
            {isLoadingMore && (
                <div className="flex justify-center p-6">
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                </div>
            )}
            {!hasMore && (
                <div className="p-6 text-center text-white/20 text-xs">
                    {t("articleList.noMore")}
                </div>
            )}
        </div>
    );
}
