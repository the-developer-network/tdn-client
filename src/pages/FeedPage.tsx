import { useEffect } from "react";
import { PageShell } from "../shared/layout/PageShell";
import { TrendingTopicsWidget } from "../shared/components/TrendingTopicsWidget";
import { PostList } from "../features/feed/components/PostList";
import { PostBox } from "../features/feed/components/PostBox";
import { useFeed } from "../features/feed/components/useFeed";
import { useAuthStore } from "../core/auth/auth.store";
import type { PostType } from "../features/feed/api/feed.types";

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
                    <div className="relative">
                        <svg
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search profiles..."
                            disabled
                            className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white/60 placeholder-white/30 cursor-not-allowed outline-none"
                        />
                    </div>
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
