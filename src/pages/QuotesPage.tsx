import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageShell } from "../shared/layout/PageShell";
import { TrendingTopicsWidget } from "../shared/components/TrendingTopicsWidget";
import { PostList } from "../features/feed/components/PostList";
import { useQuotes } from "../features/feed/hooks/useQuotes";
import { SEO } from "../shared/components/ui/SEO";
import { useI18n } from "../shared/hooks/useI18n";

/**
 * Everyone who quoted one post, newest first.
 *
 * Every row is an ordinary post carrying its own embedded card, so this is
 * `PostList` with a different source — likes, bookmarks, comments and delete
 * all work here without a single special case.
 */
export default function QuotesPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useI18n();

    const {
        quotes,
        isLoading,
        isLoadingMore,
        error,
        loadMoreError,
        hasMore,
        fetchQuotes,
        loadMore,
        retry,
        retryLoadMore,
        addQuote,
        removeQuote,
    } = useQuotes(id);

    useEffect(() => {
        fetchQuotes();
    }, [fetchQuotes]);

    return (
        <PageShell rightRail={<TrendingTopicsWidget />}>
            <SEO
                title={t("page.quotes")}
                canonical={id ? `/posts/${id}/quotes` : undefined}
            />
            <div
                className="sticky top-0 z-10 flex cursor-pointer items-center gap-6 border-b border-white/10 bg-black/80 px-4 py-3 backdrop-blur-md"
                onClick={() => navigate(-1)}
            >
                <button className="-ml-2 rounded-full p-2 text-white transition-colors hover:bg-white/10">
                    <svg
                        width="20"
                        height="20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M10 19l-7-7m0 0l7-7m-7 7h18"
                        />
                    </svg>
                </button>
                <h2 className="text-xl font-bold tracking-wide text-white">
                    {t("page.quotes")}
                </h2>
            </div>

            <PostList
                posts={quotes}
                isLoading={isLoading}
                isLoadingMore={isLoadingMore}
                hasMore={hasMore}
                error={error}
                loadMoreError={loadMoreError}
                emptyMessage={t("quoteList.empty")}
                onPostDeleted={removeQuote}
                onPostQuoted={(post) => {
                    // A quote made from a row on this page quotes that row,
                    // not the post this page is about. Only a quote of the
                    // subject belongs in this list.
                    if (post.quotedPost?.id === id) addQuote(post);
                }}
                onLoadMore={loadMore}
                onRetry={retry}
                onRetryLoadMore={retryLoadMore}
            />
        </PageShell>
    );
}
