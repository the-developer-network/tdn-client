import { useCallback, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Hash, TrendingUp } from "lucide-react";
import { PageShell } from "../shared/layout/PageShell";
import { TrendingTopicsWidget } from "../shared/components/TrendingTopicsWidget";
import { PostList } from "../features/feed/components/PostList";
import { useFeed } from "../features/feed/components/useFeed";
import { ArticleList } from "../features/article/components/ArticleList";
import { useArticles } from "../features/article/hooks/useArticles";
import { useTrends } from "../features/trends/hooks/useTrends";
import { useTagSearch } from "../features/trends/hooks/useTagSearch";
import { useI18n } from "../shared/hooks/useI18n";

/**
 * A tag is not a post-only idea: `GET /articles?tag=` narrows articles the same
 * way `GET /posts?tag=` narrows posts, and an author who tags an article
 * `nodejs` expects it to turn up under #nodejs. The two are separate resources
 * behind separate endpoints, so the tag view carries the same Posts / Articles
 * strip the profile does.
 *
 * Which one is open lives in the query string beside the tag, so
 * `/explore?tag=nodejs&tab=articles` is a link someone can send and a Back
 * returns to the list it left. `posts` is the default and is left out of the
 * URL, so the plain `/explore?tag=nodejs` already shared around still opens
 * on posts.
 */
type ExploreTab = "posts" | "articles";

const TAB_PARAM = "tab";

export default function ExplorePage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { t } = useI18n();
    const tag = searchParams.get("tag");
    // Anything but the one known alternative opens posts, rather than an
    // empty page for a slug nobody serves.
    const tab: ExploreTab =
        searchParams.get(TAB_PARAM) === "articles" ? "articles" : "posts";
    const isArticles = tab === "articles";

    const {
        posts,
        isLoading: postsLoading,
        isLoadingMore: postsLoadingMore,
        error: postsError,
        loadMoreError: postsLoadMoreError,
        hasMore: hasMorePosts,
        fetchPosts,
        loadMore: loadMorePosts,
        removePost,
        retry: retryPosts,
        retryLoadMore: retryLoadMorePosts,
    } = useFeed();
    const {
        articles,
        isLoading: articlesLoading,
        isLoadingMore: articlesLoadingMore,
        error: articlesError,
        loadMoreError: articlesLoadMoreError,
        hasMore: hasMoreArticles,
        fetchArticles,
        loadMore: loadMoreArticles,
        retry: retryArticles,
        retryLoadMore: retryLoadMoreArticles,
    } = useArticles();
    const { trends, isLoading: trendsLoading } = useTrends();
    const {
        query,
        setQuery,
        results,
        isLoading: searchLoading,
        clear,
    } = useTagSearch();

    const searchRef = useRef<HTMLDivElement>(null);
    const showDropdown = query.length >= 2;

    useEffect(() => {
        if (!showDropdown) return;

        function handleClickOutside(e: MouseEvent) {
            if (
                searchRef.current &&
                !searchRef.current.contains(e.target as Node)
            ) {
                clear();
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, [showDropdown, clear]);

    function handleSelectTag(name: string) {
        clear();
        navigate(`/explore?tag=${encodeURIComponent(name)}`);
    }

    /**
     * Replaces rather than pushes. Back here is for leaving the tag, not for
     * walking back through which of its two lists was looked at last.
     */
    const handleTabChange = useCallback(
        (next: ExploreTab) => {
            const params = new URLSearchParams(searchParams);
            if (next === "posts") params.delete(TAB_PARAM);
            else params.set(TAB_PARAM, next);
            setSearchParams(params, { replace: true });
        },
        [searchParams, setSearchParams],
    );

    // The two lists come from different endpoints, so each effect stands down
    // while the other tab is showing — otherwise opening Articles would still
    // refetch the posts behind it.
    useEffect(() => {
        if (!tag || isArticles) return;
        fetchPosts({ tag });
    }, [tag, isArticles, fetchPosts]);

    useEffect(() => {
        if (!tag || !isArticles) return;
        fetchArticles({ tag });
    }, [tag, isArticles, fetchArticles]);

    return (
        <PageShell rightRail={<TrendingTopicsWidget />}>
            {tag ? (
                // --- Tag filtered view ---
                <>
                    <div className="sticky top-0 z-10 bg-ground/80 backdrop-blur-md border-b border-ink/10">
                        <div className="flex items-center gap-3 px-4 py-4">
                            <button
                                onClick={() => navigate("/explore")}
                                className="p-2 rounded-full hover:bg-ink/10 transition-colors text-ink/70 hover:text-ink"
                            >
                                <ArrowLeft size={18} />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-ink">
                                    #{tag}
                                </h1>
                                <p className="text-xs text-ink/40 mt-0.5">
                                    {t(
                                        isArticles
                                            ? "explore.articlesTaggedSubtitle"
                                            : "explore.postsTaggedSubtitle",
                                        { tag },
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="flex w-full border-t border-ink/10">
                            {(["posts", "articles"] as const).map((value) => (
                                <button
                                    key={value}
                                    onClick={() => handleTabChange(value)}
                                    className={`relative flex-1 py-3 text-sm font-medium transition-colors ${
                                        tab === value
                                            ? "text-ink"
                                            : "text-ink/40 hover:text-ink/70"
                                    }`}
                                >
                                    {t(
                                        value === "posts"
                                            ? "profile.tabPosts"
                                            : "profile.tabArticles",
                                    )}
                                    {tab === value && (
                                        <span className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-ink" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {isArticles ? (
                        <ArticleList
                            articles={articles}
                            isLoading={articlesLoading}
                            isLoadingMore={articlesLoadingMore}
                            hasMore={hasMoreArticles}
                            error={articlesError}
                            loadMoreError={articlesLoadMoreError}
                            onLoadMore={loadMoreArticles}
                            onRetry={retryArticles}
                            onRetryLoadMore={retryLoadMoreArticles}
                        />
                    ) : (
                        <PostList
                            posts={posts}
                            isLoading={postsLoading}
                            isLoadingMore={postsLoadingMore}
                            hasMore={hasMorePosts}
                            error={postsError}
                            loadMoreError={postsLoadMoreError}
                            onPostDeleted={removePost}
                            onLoadMore={loadMorePosts}
                            onRetry={retryPosts}
                            onRetryLoadMore={retryLoadMorePosts}
                        />
                    )}
                </>
            ) : (
                // --- Trending grid view ---
                <>
                    <div className="sticky top-0 z-10 bg-ground/80 backdrop-blur-md border-b border-ink/10">
                        <div className="px-4 pt-4 pb-3">
                            <h1 className="text-xl font-bold text-ink mb-3">
                                {t("explore.title")}
                            </h1>
                            <div ref={searchRef} className="relative">
                                <Search
                                    size={16}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30 z-10"
                                />
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder={t("explore.searchPlaceholder")}
                                    className="w-full bg-ink/5 border border-ink/10 rounded-full py-2 pl-10 pr-4 text-sm text-ink placeholder-ink/30 outline-none focus:border-ink/30 transition-colors"
                                />
                                {showDropdown && (
                                    <div className="absolute left-0 right-0 top-full mt-2 bg-surface-1 border border-ink/10 rounded-2xl overflow-hidden z-20 shadow-xl">
                                        {searchLoading && (
                                            <div className="flex justify-center py-4">
                                                <div className="w-4 h-4 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
                                            </div>
                                        )}
                                        {!searchLoading &&
                                            results.length === 0 && (
                                                <p className="px-4 py-3 text-sm text-ink/40">
                                                    {t("explore.noTagsFound", {
                                                        query,
                                                    })}
                                                </p>
                                            )}
                                        {!searchLoading &&
                                            results.map((r) => (
                                                <button
                                                    key={r.name}
                                                    onClick={() =>
                                                        handleSelectTag(r.name)
                                                    }
                                                    className="w-full text-left px-4 py-3 hover:bg-ink/5 transition-colors border-b border-ink/5 last:border-0"
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        <Hash
                                                            size={13}
                                                            className="text-blue-400 shrink-0"
                                                        />
                                                        <p className="text-sm font-bold text-ink">
                                                            {r.name}
                                                        </p>
                                                        <span className="ml-auto text-xs text-ink/40">
                                                            {r.postCount.toLocaleString()}{" "}
                                                            {t(
                                                                "trending.posts",
                                                            )}
                                                        </span>
                                                    </div>
                                                    {r.category && (
                                                        <p className="text-xs text-ink/40 mt-0.5 pl-5">
                                                            {r.category}
                                                        </p>
                                                    )}
                                                </button>
                                            ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="px-4 py-5">
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp size={16} className="text-ink/50" />
                            <h2 className="text-base font-bold text-ink">
                                {t("explore.trendingTopics")}
                            </h2>
                            <span className="text-xs text-ink/30 ml-1">
                                · {t("explore.lastDays")}
                            </span>
                        </div>

                        {trendsLoading && (
                            <div className="flex justify-center py-10">
                                <div className="w-6 h-6 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
                            </div>
                        )}

                        {!trendsLoading && (
                            <div className="grid grid-cols-2 gap-3">
                                {trends.map((trend) => (
                                    <button
                                        key={trend.tag}
                                        onClick={() =>
                                            navigate(
                                                `/explore?tag=${trend.tag}`,
                                            )
                                        }
                                        className="text-left bg-surface-1/60 border border-ink/10 rounded-2xl px-4 py-4 hover:bg-ink/5 hover:border-ink/20 transition-all"
                                    >
                                        <p className="text-xs text-ink/40 mb-1">
                                            {trend.category}
                                        </p>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Hash
                                                size={14}
                                                className="text-blue-400 shrink-0"
                                            />
                                            <p className="text-sm font-bold text-ink truncate">
                                                {trend.tag}
                                            </p>
                                        </div>
                                        <p className="text-xs text-ink/40">
                                            {trend.postCount.toLocaleString()}{" "}
                                            {t("trending.posts")}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </PageShell>
    );
}
