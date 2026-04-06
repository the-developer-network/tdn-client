import { useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Hash, TrendingUp } from "lucide-react";
import { PageShell } from "../shared/layout/PageShell";
import { TrendingTopicsWidget } from "../shared/components/TrendingTopicsWidget";
import { PostList } from "../features/feed/components/PostList";
import { useFeed } from "../features/feed/components/useFeed";
import { useTrends } from "../features/trends/hooks/useTrends";
import { useTagSearch } from "../features/trends/hooks/useTagSearch";

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
                            <div ref={searchRef} className="relative">
                                <Search
                                    size={16}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 z-10"
                                />
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search tags..."
                                    className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white placeholder-white/30 outline-none focus:border-white/30 transition-colors"
                                />
                                {showDropdown && (
                                    <div className="absolute left-0 right-0 top-full mt-2 bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden z-20 shadow-xl">
                                        {searchLoading && (
                                            <div className="flex justify-center py-4">
                                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            </div>
                                        )}
                                        {!searchLoading &&
                                            results.length === 0 && (
                                                <p className="px-4 py-3 text-sm text-white/40">
                                                    No tags found for &ldquo;
                                                    {query}&rdquo;
                                                </p>
                                            )}
                                        {!searchLoading &&
                                            results.map((r) => (
                                                <button
                                                    key={r.name}
                                                    onClick={() =>
                                                        handleSelectTag(r.name)
                                                    }
                                                    className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        <Hash
                                                            size={13}
                                                            className="text-blue-400 shrink-0"
                                                        />
                                                        <p className="text-sm font-bold text-white">
                                                            {r.name}
                                                        </p>
                                                        <span className="ml-auto text-xs text-white/40">
                                                            {r.postCount.toLocaleString()}{" "}
                                                            posts
                                                        </span>
                                                    </div>
                                                    {r.category && (
                                                        <p className="text-xs text-white/40 mt-0.5 pl-5">
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
