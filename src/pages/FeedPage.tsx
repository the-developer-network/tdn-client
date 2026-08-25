import { useEffect, useState } from "react";
import {
    Gamepad2,
    Monitor,
    Server,
    Smartphone,
    Sparkles,
    Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageShell } from "../shared/layout/PageShell";
import { TrendingTopicsWidget } from "../shared/components/TrendingTopicsWidget";
import { PostList } from "../features/feed/components/PostList";
import { PostBox } from "../features/feed/components/PostBox";
import { useFeed } from "../features/feed/components/useFeed";
import { ArticleList } from "../features/article/components/ArticleList";
import { useArticles } from "../features/article/hooks/useArticles";
import { useAuthStore } from "../core/auth/auth.store";
import { useAuthModalStore } from "../features/auth/store/auth-modal.store";
import type { PostCategory, PostType } from "../features/feed/api/feed.types";
import { ProfileSearchDropdown } from "../features/profile/components/ProfileSearchDropdown";
import { SEO } from "../shared/components/ui/SEO";
import { useI18n } from "../shared/hooks/useI18n";
import type { TranslationKey } from "../shared/i18n/translations";

/**
 * Articles are a separate resource, not a `PostType` — they have their own
 * endpoints, their own slugged detail route and a markdown body. The tab sits
 * alongside the post filters because that is where readers look for it, but it
 * cannot be a value in the `PostType` union, so the strip is keyed by this
 * wider type and the articles case is branched on explicitly.
 */
type FeedTab = PostType | "ARTICLES";

const ARTICLES_TAB = "ARTICLES";

const CATEGORIES: { labelKey: TranslationKey; value: FeedTab }[] = [
    { labelKey: "feed.community", value: "COMMUNITY" },
    { labelKey: "feed.news", value: "TECH_NEWS" },
    { labelKey: "feed.updates", value: "SYSTEM_UPDATE" },
    { labelKey: "feed.articles", value: ARTICLES_TAB },
];

const FOLLOWED_ONLY_TABS: FeedTab[] = ["TECH_NEWS", "SYSTEM_UPDATE"];

const FILTER_CATEGORIES: {
    labelKey: TranslationKey;
    value: PostCategory;
    Icon: LucideIcon;
}[] = [
    { labelKey: "feed.frontend", value: "FRONTEND", Icon: Monitor },
    { labelKey: "feed.backend", value: "BACKEND", Icon: Server },
    { labelKey: "feed.mobile", value: "MOBILE", Icon: Smartphone },
    { labelKey: "feed.game", value: "GAME", Icon: Gamepad2 },
    { labelKey: "feed.ai", value: "AI", Icon: Sparkles },
];

export default function FeedPage() {
    const { t } = useI18n();
    const [activeTab, setActiveTab] = useState<FeedTab>("COMMUNITY");
    const [followedOnly, setFollowedOnly] = useState(false);
    const [selectedCategories, setSelectedCategories] = useState<
        PostCategory[]
    >([]);

    const {
        posts,
        isLoading,
        isLoadingMore,
        error,
        loadMoreError,
        fetchPosts,
        activeCategory,
        changeCategory,
        addPost,
        removePost,
        hasMore,
        loadMore,
        retry,
        retryLoadMore,
    } = useFeed(followedOnly, selectedCategories);

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

    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const openModal = useAuthModalStore((state) => state.openModal);

    const isArticles = activeTab === ARTICLES_TAB;

    // The two lists fetch from different endpoints, so each effect stands down
    // while the other tab is showing — otherwise switching to Articles would
    // still refetch posts on every filter change behind it.
    useEffect(() => {
        if (isArticles) return;
        fetchPosts(activeCategory);
    }, [
        isArticles,
        activeCategory,
        fetchPosts,
        isAuthenticated,
        followedOnly,
        selectedCategories,
    ]);

    useEffect(() => {
        if (!isArticles) return;
        fetchArticles({ followedOnly, categories: selectedCategories });
    }, [
        isArticles,
        fetchArticles,
        isAuthenticated,
        followedOnly,
        selectedCategories,
    ]);

    function handleTabChange(tab: FeedTab) {
        setFollowedOnly(false);
        setSelectedCategories([]);
        setActiveTab(tab);
        // Articles keep their own state in `useArticles`; only the post feed
        // needs telling which type it is now showing.
        if (tab !== ARTICLES_TAB) changeCategory(tab);
    }

    function handleToggleCategory(cat: PostCategory) {
        setSelectedCategories((prev) =>
            prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
        );
    }

    function handleFollowedOnlyToggle() {
        if (!isAuthenticated) {
            openModal();
            return;
        }
        setFollowedOnly((prev) => !prev);
    }

    // Articles support both narrowings too, so they get the same chip row.
    const showFilters = isArticles || FOLLOWED_ONLY_TABS.includes(activeTab);
    const showPostBox = !isArticles && !FOLLOWED_ONLY_TABS.includes(activeTab);

    return (
        <PageShell rightRail={<TrendingTopicsWidget />}>
            <SEO
                description="TDN is the social network for developers. Share code, tech news, articles and connect with the dev community."
                canonical="/"
            />
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10">
                {/* Search */}
                <div className="px-4 pt-4 pb-3">
                    <ProfileSearchDropdown />
                </div>

                {/* Categories */}
                <div className="flex w-full border-b border-white/5">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.value}
                            onClick={() => handleTabChange(cat.value)}
                            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                                activeTab === cat.value
                                    ? "text-white"
                                    : "text-white/40 hover:text-white/70"
                            }`}
                        >
                            {t(cat.labelKey)}
                            {activeTab === cat.value && (
                                <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-white rounded-full" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Following toggle + category filters — News, Updates, Articles */}
                {showFilters && (
                    <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto">
                        <button
                            onClick={handleFollowedOnlyToggle}
                            className={`flex shrink-0 items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                followedOnly
                                    ? "bg-white text-black"
                                    : "bg-white/10 text-white/60 hover:bg-white/15 hover:text-white/80"
                            }`}
                        >
                            <Users size={13} />
                            {t("feed.following")}
                        </button>
                        <div className="w-px h-4 bg-white/10 shrink-0" />
                        {FILTER_CATEGORIES.map(({ labelKey, value, Icon }) => (
                            <button
                                key={value}
                                onClick={() => handleToggleCategory(value)}
                                className={`flex shrink-0 items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                    selectedCategories.includes(value)
                                        ? "bg-white text-black"
                                        : "bg-white/10 text-white/60 hover:bg-white/15 hover:text-white/80"
                                }`}
                            >
                                <Icon size={13} />
                                {t(labelKey)}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Post Box — hidden on News, Updates and Articles */}
            {showPostBox && (
                <PostBox
                    onPostCreated={addPost}
                    activeCategory={activeCategory}
                />
            )}

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
                    isLoading={isLoading}
                    isLoadingMore={isLoadingMore}
                    hasMore={hasMore}
                    error={error}
                    loadMoreError={loadMoreError}
                    onPostDeleted={removePost}
                    onLoadMore={loadMore}
                    onRetry={retry}
                    onRetryLoadMore={retryLoadMore}
                />
            )}
        </PageShell>
    );
}
