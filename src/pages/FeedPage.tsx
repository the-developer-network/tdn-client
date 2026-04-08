import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { PageShell } from "../shared/layout/PageShell";
import { TrendingTopicsWidget } from "../shared/components/TrendingTopicsWidget";
import { PostList } from "../features/feed/components/PostList";
import { PostBox } from "../features/feed/components/PostBox";
import { useFeed } from "../features/feed/components/useFeed";
import { useAuthStore } from "../core/auth/auth.store";
import { useAuthModalStore } from "../features/auth/store/auth-modal.store";
import type { PostType } from "../features/feed/api/feed.types";
import { ProfileSearchDropdown } from "../features/profile/components/ProfileSearchDropdown";
import { SEO } from "../shared/components/ui/SEO";

const CATEGORIES: { label: string; value: PostType }[] = [
    { label: "Community", value: "COMMUNITY" },
    { label: "News", value: "TECH_NEWS" },
    { label: "Updates", value: "SYSTEM_UPDATE" },
    { label: "Jobs", value: "JOB_POSTING" },
];

const FOLLOWED_ONLY_TABS: PostType[] = ["TECH_NEWS", "SYSTEM_UPDATE"];

export default function FeedPage() {
    const [followedOnly, setFollowedOnly] = useState(false);

    const {
        posts,
        isLoading,
        isLoadingMore,
        error,
        fetchPosts,
        activeCategory,
        changeCategory,
        addPost,
        removePost,
        hasMore,
        loadMore,
    } = useFeed(followedOnly);

    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const openModal = useAuthModalStore((state) => state.openModal);

    useEffect(() => {
        fetchPosts(activeCategory);
    }, [activeCategory, fetchPosts, isAuthenticated, followedOnly]);

    function handleCategoryChange(type: PostType) {
        setFollowedOnly(false);
        changeCategory(type);
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
                            key={cat.label}
                            onClick={() => handleCategoryChange(cat.value)}
                            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                                activeCategory === cat.value
                                    ? "text-white"
                                    : "text-white/40 hover:text-white/70"
                            }`}
                        >
                            {cat.label}
                            {activeCategory === cat.value && (
                                <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-white rounded-full" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Following toggle — only on News & Updates */}
                {showFollowedOnlyToggle && (
                    <div className="flex items-center px-4 py-2">
                        <button
                            onClick={handleFollowedOnlyToggle}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                followedOnly
                                    ? "bg-white text-black"
                                    : "bg-white/10 text-white/60 hover:bg-white/15 hover:text-white/80"
                            }`}
                        >
                            <Users size={13} />
                            Following
                        </button>
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
                onPostDeleted={removePost}
                onLoadMore={loadMore}
            />
        </PageShell>
    );
}
