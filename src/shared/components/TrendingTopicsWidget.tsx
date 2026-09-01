import { useNavigate } from "react-router-dom";
import { useTrends } from "../../features/trends/hooks/useTrends";
import { useI18n } from "../hooks/useI18n";

export function TrendingTopicsWidget() {
    const { trends, isLoading, error } = useTrends();
    const navigate = useNavigate();
    const { t } = useI18n();

    return (
        <div className="pt-4 px-4">
            <div className="bg-surface-1/60 border border-ink/10 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-ink/10">
                    <h2 className="text-lg font-bold text-ink">
                        {t("trending.title")}
                    </h2>
                    <p className="text-xs text-ink/40 mt-0.5">
                        {t("trending.subtitle")}
                    </p>
                </div>

                <div className="divide-y divide-ink/5">
                    {isLoading && (
                        <p className="px-4 py-3 text-sm text-ink/40">
                            {t("trending.loading")}
                        </p>
                    )}
                    {error && (
                        <p className="px-4 py-3 text-sm text-red-400">
                            {error}
                        </p>
                    )}
                    {!isLoading && !error && trends.length === 0 && (
                        <p className="px-4 py-3 text-sm text-ink/40">
                            {t("trending.empty")}
                        </p>
                    )}
                    {trends.slice(0, 7).map((trend) => (
                        <div
                            key={trend.tag}
                            onClick={() =>
                                navigate(`/explore?tag=${trend.tag}`)
                            }
                            className="px-4 py-3 hover:bg-ink/5 transition-colors cursor-pointer"
                        >
                            <p className="text-xs text-ink/40">
                                {trend.category}
                            </p>
                            <p className="text-sm font-bold text-ink mt-0.5">
                                #{trend.tag}
                            </p>
                            <p className="text-xs text-ink/40 mt-0.5">
                                {trend.postCount.toLocaleString()}{" "}
                                {t("trending.posts")}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="px-4 py-3 border-t border-ink/5">
                    <span
                        onClick={() => navigate("/explore")}
                        className="text-sm text-blue-400 hover:text-blue-300 cursor-pointer transition-colors"
                    >
                        {t("trending.showMore")}
                    </span>
                </div>
            </div>
        </div>
    );
}
