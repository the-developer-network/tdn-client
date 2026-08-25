import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Clock } from "lucide-react";
import { getSafeImageSrc } from "../../../shared/utils/image-src";
import { useI18n } from "../../../shared/hooks/useI18n";
import type { ArticleSummary } from "../api/article.types";

type ArticleCardProps = ArticleSummary;

export function ArticleCard({
    slug,
    title,
    excerpt,
    coverImageUrl,
    coverImageAlt,
    readingTimeMinutes,
    likeCount,
    commentCount,
    publishedAt,
    createdAt,
    author,
    tags,
}: ArticleCardProps) {
    const navigate = useNavigate();
    const { t, locale } = useI18n();

    const cover = getSafeImageSrc(coverImageUrl);
    const avatar = getSafeImageSrc(author.avatarUrl);

    const goToProfile = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/profile/${author.username}`);
    };

    return (
        <article
            onClick={() => navigate(`/articles/${slug}`)}
            className="flex cursor-pointer flex-col gap-3 border-b border-white/10 p-4 transition-colors hover:bg-white/[0.03]"
        >
            <div className="flex items-center gap-2 text-sm">
                <button
                    onClick={goToProfile}
                    className="flex items-center gap-2 hover:underline"
                >
                    {avatar ? (
                        <img
                            src={avatar}
                            alt=""
                            className="h-6 w-6 rounded-full border border-white/10 object-cover"
                        />
                    ) : (
                        <span className="h-6 w-6 rounded-full bg-white/10" />
                    )}
                    <span className="font-medium text-white">
                        {author.fullName || `@${author.username}`}
                    </span>
                </button>
                <span className="text-white/20">·</span>
                <span className="text-white/40">
                    {new Date(publishedAt ?? createdAt).toLocaleDateString(
                        locale,
                        { day: "numeric", month: "short" },
                    )}
                </span>
            </div>

            <div className="flex gap-4">
                <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold leading-snug text-white">
                        {title}
                    </h2>
                    {/* Plain text on purpose: the server strips markdown marks
                        from a derived excerpt but does not sanitise HTML. */}
                    <p className="mt-1 line-clamp-3 text-sm leading-6 text-white/50">
                        {excerpt}
                    </p>
                </div>
                {cover && (
                    <img
                        src={cover}
                        alt={coverImageAlt ?? ""}
                        loading="lazy"
                        className="h-20 w-28 shrink-0 rounded-lg border border-white/10 object-cover sm:h-24 sm:w-36"
                    />
                )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/40">
                <span className="flex items-center gap-1">
                    <Clock size={13} />
                    {t("article.readingTime", { n: readingTimeMinutes })}
                </span>
                <span className="flex items-center gap-1">
                    <Heart size={13} />
                    {likeCount}
                </span>
                <span className="flex items-center gap-1">
                    <MessageCircle size={13} />
                    {commentCount}
                </span>
                {tags.slice(0, 3).map((tag) => (
                    <span
                        key={tag.name}
                        className="rounded-full bg-white/5 px-2 py-0.5 text-white/50"
                    >
                        #{tag.name}
                    </span>
                ))}
            </div>
        </article>
    );
}
