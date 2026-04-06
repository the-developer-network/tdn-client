import { useEffect } from "react";
import { PageShell } from "../shared/layout/PageShell";
import { TrendingTopicsWidget } from "../shared/components/TrendingTopicsWidget";
import { PostList } from "../features/feed/components/PostList";
import { PostBox } from "../features/feed/components/PostBox";
import { useFeed } from "../features/feed/components/useFeed";
import { useAuthStore } from "../core/auth/auth.store";
import type { PostType } from "../features/feed/api/feed.types";
import { ProfileSearchDropdown } from "../features/profile/components/ProfileSearchDropdown";

const CATEGORIES: { label: string; value: PostType }[] = [
    { label: "Community", value: "COMMUNITY" },
    { label: "News", value: "TECH_NEWS" },
    { label: "Updates", value: "SYSTEM_UPDATE" },
    { label: "Jobs", value: "JOB_POSTING" },
];

export default function FeedPage() {
    const {
        posts,
        isLoading,
        error,
        fetchPosts,
        activeCategory,
        changeCategory,
        addPost,
        removePost,
    } = useFeed();

    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    useEffect(() => {
        fetchPosts(activeCategory);
    }, [activeCategory, fetchPosts, isAuthenticated]);

    return (
        <PageShell rightRail={<TrendingTopicsWidget />}>
            {/* Header */}
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
                            onClick={() => changeCategory(cat.value)}
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
            </div>

            {/* Post Box */}
            <PostBox onPostCreated={addPost} activeCategory={activeCategory} />

            <PostList
                posts={posts}
                isLoading={isLoading}
                error={error}
                onPostDeleted={removePost}
            />
        </PageShell>
    );
}
