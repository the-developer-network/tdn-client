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
import { useAuthStore } from "../core/auth/auth.store";
import { useAuthModalStore } from "../features/auth/store/auth-modal.store";
import type { PostCategory, PostType } from "../features/feed/api/feed.types";
import { ProfileSearchDropdown } from "../features/profile/components/ProfileSearchDropdown";
import { SEO } from "../shared/components/ui/SEO";
import { useI18n } from "../shared/hooks/useI18n";
import type { TranslationKey } from "../shared/i18n/translations";

const CATEGORIES: { labelKey: TranslationKey; value: PostType }[] = [
    { labelKey: "feed.community", value: "COMMUNITY" },
    { labelKey: "feed.news", value: "TECH_NEWS" },
    { labelKey: "feed.updates", value: "SYSTEM_UPDATE" },
    { labelKey: "feed.jobs", value: "JOB_POSTING" },
];

const FOLLOWED_ONLY_TABS: PostType[] = ["TECH_NEWS", "SYSTEM_UPDATE"];

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

    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const openModal = useAuthModalStore((state) => state.openModal);

    useEffect(() => {
        fetchPosts(activeCategory);
    }, [
        activeCategory,
        fetchPosts,
        isAuthenticated,
        followedOnly,
        selectedCategories,
    ]);

    function handleCategoryChange(type: PostType) {
        setFollowedOnly(false);
        setSelectedCategories([]);
        changeCategory(type);
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

    const showFollowedOnlyToggle = FOLLOWED_ONLY_TABS.includes(activeCategory);
    const showPostBox = !FOLLOWED_ONLY_TABS.includes(activeCategory);

    return (
        <PageShell rightRail={<TrendingTopicsWidget />}>
            <SEO
                description="TDN is the social network for developers. Share code, tech news, job postings and connect with the dev community."
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
                            onClick={() => handleCategoryChange(cat.value)}
                            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                                activeCategory === cat.value
                                    ? "text-white"
                                    : "text-white/40 hover:text-white/70"
                            }`}
                        >
                            {t(cat.labelKey)}
                            {activeCategory === cat.value && (
                                <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-white rounded-full" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Following toggle + category filters — only on News & Updates */}
                {showFollowedOnlyToggle && (
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

            {/* Post Box — hidden on News & Updates */}
            {showPostBox && (
                <PostBox
                    onPostCreated={addPost}
                    activeCategory={activeCategory}
                />
            )}

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
        </PageShell>
    );
}
