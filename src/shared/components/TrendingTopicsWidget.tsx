import { useNavigate } from "react-router-dom";
import { useTrends } from "../../features/trends/hooks/useTrends";

export function TrendingTopicsWidget() {
    const { trends, isLoading, error } = useTrends();
    const navigate = useNavigate();

    return (
        <div className="pt-4 px-4">
            <div className="bg-zinc-900/60 border border-white/10 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10">
                    <h2 className="text-lg font-bold text-white">
                        Trending Topics
                    </h2>
                    <p className="text-xs text-white/40 mt-0.5">
                        Popular on TDN right now
                    </p>
                </div>

                <div className="divide-y divide-white/5">
                    {isLoading && (
                        <p className="px-4 py-3 text-sm text-white/40">
                            Loading...
                        </p>
                    )}
                    {error && (
                        <p className="px-4 py-3 text-sm text-red-400">
                            {error}
                        </p>
                    )}
                    {!isLoading && !error && trends.length === 0 && (
                        <p className="px-4 py-3 text-sm text-white/40">
                            No trends yet.
                        </p>
                    )}
                    {trends.slice(0, 7).map((trend) => (
                        <div
                            key={trend.tag}
                            onClick={() =>
                                navigate(`/explore?tag=${trend.tag}`)
                            }
                            className="px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer"
                        >
                            <p className="text-xs text-white/40">
                                {trend.category}
                            </p>
                            <p className="text-sm font-bold text-white mt-0.5">
                                #{trend.tag}
                            </p>
                            <p className="text-xs text-white/40 mt-0.5">
                                {trend.postCount.toLocaleString()} posts
                            </p>
                        </div>
                    ))}
                </div>

                <div className="px-4 py-3 border-t border-white/5">
                    <span
                        onClick={() => navigate("/explore")}
                        className="text-sm text-blue-400 hover:text-blue-300 cursor-pointer transition-colors"
                    >
                        Show more
                    </span>
                </div>
            </div>
        </div>
    );
}
