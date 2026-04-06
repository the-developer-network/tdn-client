import { RefreshCw } from "lucide-react";
import { PageShell } from "../shared/layout/PageShell";
import { TrendingTopicsWidget } from "../shared/components/TrendingTopicsWidget";
import { SuggestionCard } from "../features/profile/components/SuggestionCard";
import { useSuggestions } from "../features/profile/hooks/useSuggestions";

export default function FollowsPage() {
    const { suggestions, isLoading, error, refetch } = useSuggestions(10);

    return (
        <PageShell rightRail={<TrendingTopicsWidget />}>
            {/* Header */}
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 py-4 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-white">
                        Who to Follow
                    </h1>
                    <p className="text-sm text-white/40 mt-1">
                        Developers you might want to follow
                    </p>
                </div>
                <button
                    onClick={refetch}
                    disabled={isLoading}
                    className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
                    aria-label="Refresh suggestions"
                >
                    <RefreshCw
                        size={18}
                        className={isLoading ? "animate-spin" : ""}
                    />
                </button>
            </div>

            {/* Loading skeletons */}
            {isLoading && suggestions.length === 0 && (
                <div className="divide-y divide-white/10">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div
                            key={i}
                            className="flex items-start gap-3 px-4 py-4"
                        >
                            <div className="shrink-0 w-10 h-10 rounded-full bg-white/10 animate-pulse" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
                                <div className="h-3 w-24 bg-white/10 rounded animate-pulse" />
                                <div className="h-3 w-48 bg-white/10 rounded animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Error state */}
            {error && !isLoading && (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                    <p className="text-white/60 text-[15px] mb-4">{error}</p>
                    <button
                        onClick={refetch}
                        className="px-4 py-2 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors"
                    >
                        Try again
                    </button>
                </div>
            )}

            {/* Empty state */}
            {!isLoading && !error && suggestions.length === 0 && (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                    <div className="w-16 h-16 rounded-full border border-white/10 bg-white/5 flex items-center justify-center mb-4">
                        <svg
                            className="w-8 h-8 text-white/40"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">
                        No suggestions yet
                    </h2>
                    <p className="text-white/40 text-[15px] max-w-[250px]">
                        Check back later for personalized recommendations.
                    </p>
                </div>
            )}

            {/* Suggestions list */}
            {!error && suggestions.length > 0 && (
                <div>
                    {suggestions.map((user) => (
                        <SuggestionCard key={user.userId} user={user} />
                    ))}
                </div>
            )}
        </PageShell>
    );
}
