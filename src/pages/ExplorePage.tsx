import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Hash, TrendingUp } from "lucide-react";
import { PageShell } from "../shared/layout/PageShell";
import { TrendingTopicsWidget } from "../shared/components/TrendingTopicsWidget";
import { PostList } from "../features/feed/components/PostList";
import { useFeed } from "../features/feed/components/useFeed";
import { useTrends } from "../features/trends/hooks/useTrends";

export default function ExplorePage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const tag = searchParams.get("tag");

    const {
        posts,
        isLoading: postsLoading,
        error: postsError,
        fetchPosts,
        removePost,
    } = useFeed();
    const { trends, isLoading: trendsLoading } = useTrends();

    useEffect(() => {
        if (tag) {
            fetchPosts({ tag });
        }
    }, [tag, fetchPosts]);

    return (
        <PageShell rightRail={<TrendingTopicsWidget />}>
            {tag ? (
                // --- Tag filtered view ---
                <>
                    <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10">
                        <div className="flex items-center gap-3 px-4 py-4">
                            <button
                                onClick={() => navigate("/explore")}
                                className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                            >
                                <ArrowLeft size={18} />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-white">
                                    #{tag}
                                </h1>
                                <p className="text-xs text-white/40 mt-0.5">
                                    Posts tagged with #{tag}
                                </p>
                            </div>
                        </div>
                    </div>

                    <PostList
                        posts={posts}
                        isLoading={postsLoading}
                        error={postsError}
                        onPostDeleted={removePost}
                    />
                </>
            ) : (
                // --- Trending grid view ---
                <>
                    <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10">
                        <div className="px-4 pt-4 pb-3">
                            <h1 className="text-xl font-bold text-white mb-3">
                                Explore
                            </h1>
                            <div className="relative">
                                <Search
                                    size={16}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
                                />
                                <input
                                    type="text"
                                    placeholder="Search profiles..."
                                    disabled
                                    className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white/60 placeholder-white/30 cursor-not-allowed outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="px-4 py-5">
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp size={16} className="text-white/50" />
                            <h2 className="text-base font-bold text-white">
                                Trending Topics
                            </h2>
                            <span className="text-xs text-white/30 ml-1">
                                · last 7 days
                            </span>
                        </div>

                        {trendsLoading && (
                            <div className="flex justify-center py-10">
                                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
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
                                        className="text-left bg-zinc-900/60 border border-white/10 rounded-2xl px-4 py-4 hover:bg-white/5 hover:border-white/20 transition-all"
                                    >
                                        <p className="text-xs text-white/40 mb-1">
                                            {trend.category}
                                        </p>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Hash
                                                size={14}
                                                className="text-blue-400 shrink-0"
                                            />
                                            <p className="text-sm font-bold text-white truncate">
                                                {trend.tag}
                                            </p>
                                        </div>
                                        <p className="text-xs text-white/40">
                                            {trend.postCount.toLocaleString()}{" "}
                                            posts
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
