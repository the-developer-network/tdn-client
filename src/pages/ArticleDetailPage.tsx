import { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
    ArrowLeft,
    Bookmark,
    Clock,
    Heart,
    Pencil,
    Share2,
} from "lucide-react";
import { PageShell } from "../shared/layout/PageShell";
import { TrendingTopicsWidget } from "../shared/components/TrendingTopicsWidget";
import { MarkdownBody } from "../features/article/components/MarkdownBody";
import { useArticle } from "../features/article/hooks/useArticle";
import { useArticleActions } from "../features/article/hooks/useArticleActions";
import { CommentBox } from "../features/comment/components/CommentBox";
import { CommentList } from "../features/comment/components/CommentList";
import { useComments } from "../features/comment/hooks/useComments";
import { Button } from "../shared/components/ui/Button";
import { SEO } from "../shared/components/ui/SEO";
import { getSafeImageSrc } from "../shared/utils/image-src";
import { useI18n } from "../shared/hooks/useI18n";
import { SensitiveMedia } from "../shared/components/ui/SensitiveMedia";
import type { Article } from "../features/article/api/article.types";

export default function ArticleDetailPage() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { t } = useI18n();

    const { article, isLoading, error, retry } = useArticle(slug ?? "");

    return (
        <PageShell width="reading" rightRail={<TrendingTopicsWidget />}>
            <SEO
                title={article ? article.title : t("page.article")}
                description={article?.excerpt}
                canonical={slug ? `/articles/${slug}` : undefined}
            />

            <div className="sticky top-0 z-10 flex items-center gap-6 border-b border-ink/10 bg-ground/80 px-4 py-3 backdrop-blur-md">
                <button
                    onClick={() => navigate(-1)}
                    className="-ml-2 rounded-full p-2 text-ink transition-colors hover:bg-ink/10"
                    aria-label={t("common.back")}
                >
                    <ArrowLeft size={20} />
                </button>
                <h2 className="truncate text-xl font-bold tracking-wide text-ink">
                    {article ? article.title : t("page.article")}
                </h2>
            </div>

            {isLoading ? (
                <div className="flex h-40 items-center justify-center p-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-ink/10 border-t-ink" />
                </div>
            ) : error ? (
                <div className="flex flex-col items-center gap-4 p-10 text-center">
                    <p className="text-sm text-red-400/60">{error}</p>
                    <Button variant="outline" size="sm" onClick={retry}>
                        {t("articleList.tryAgain")}
                    </Button>
                </div>
            ) : article ? (
                // Keyed by id so navigating from one article to another
                // remounts the view. The action hook seeds its like and
                // bookmark state from props in `useState` initialisers, which
                // only run on mount — without the key the second article would
                // inherit the first one's counters.
                <ArticleView
                    key={article.id}
                    article={article}
                    slug={slug ?? ""}
                />
            ) : (
                <div className="p-8 text-center text-ink/40">
                    {t("page.articleNotFound")}
                </div>
            )}
        </PageShell>
    );
}

interface ArticleViewProps {
    article: Article;
    slug: string;
}

function ArticleView({ article, slug }: ArticleViewProps) {
    const { t, locale } = useI18n();
    const navigate = useNavigate();

    const {
        isLiked,
        likeCount,
        isLikeLoading,
        handleLike,
        isBookmarked,
        isBookmarkLoading,
        handleBookmark,
        handleShare,
    } = useArticleActions(
        article.id,
        slug,
        article.isLiked,
        article.likeCount,
        article.isBookmarked,
        article.title,
    );

    const {
        comments,
        isLoading: commentsLoading,
        isLoadingMore: commentsLoadingMore,
        hasMore: hasMoreComments,
        error: commentsError,
        fetchComments,
        loadMore: loadMoreComments,
        addComment,
        removeComment,
        retry: retryComments,
    } = useComments({ type: "article", id: article.id });

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    const cover = getSafeImageSrc(article.coverImageUrl);
    const avatar = getSafeImageSrc(article.author.avatarUrl);

    return (
        <article>
            {/* A cover is optional, and most articles will not have one. The
                header simply starts at the top when it is absent — nothing is
                reserved for it, so a text-only article reads as deliberate
                rather than as a picture that failed to load. */}
            {cover && (
                <figure className="border-b border-ink/10">
                    {/* Full width, but bounded in height. Left to its natural
                        ratio, a portrait cover renders 720 wide by over a
                        thousand tall and the reader opens the article to a
                        wall of image with the title below the fold. Capping
                        the height and cropping keeps it a banner. */}
                    <SensitiveMedia isSensitive={article.isSensitive}>
                        <img
                            src={cover}
                            alt={article.coverImageAlt ?? ""}
                            className="max-h-[60vh] w-full object-cover"
                        />
                    </SensitiveMedia>
                    {article.coverImageAlt && (
                        <figcaption className="px-4 py-2 text-center text-xs text-ink/35">
                            {article.coverImageAlt}
                        </figcaption>
                    )}
                </figure>
            )}

            <header className="border-b border-ink/10 px-4 pb-6 pt-8">
                <h1 className="text-[32px] font-bold leading-[1.2] tracking-tight text-ink sm:text-[40px]">
                    {article.title}
                </h1>
                <p className="mt-3 text-lg leading-7 text-ink/50">
                    {article.excerpt}
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                    <button
                        onClick={() =>
                            navigate(`/profile/${article.author.username}`)
                        }
                        className="flex items-center gap-2 hover:underline"
                    >
                        {avatar ? (
                            <img
                                src={avatar}
                                alt=""
                                className="h-10 w-10 rounded-full border border-ink/10 object-cover"
                            />
                        ) : (
                            <span className="h-10 w-10 rounded-full bg-ink/10" />
                        )}
                        <span className="font-medium text-ink">
                            {article.author.fullName ||
                                `@${article.author.username}`}
                        </span>
                    </button>
                    <span className="text-ink/20">·</span>
                    <span className="text-ink/40">
                        {new Date(
                            article.publishedAt ?? article.createdAt,
                        ).toLocaleDateString(locale, {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                        })}
                    </span>
                    <span className="text-ink/20">·</span>
                    <span className="flex items-center gap-1 text-ink/40">
                        <Clock size={13} />
                        {t("article.readingTime", {
                            n: article.readingTimeMinutes,
                        })}
                    </span>
                </div>
                {article.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {article.tags.map((tag) => (
                            <span
                                key={tag.name}
                                className="rounded-full bg-ink/5 px-2.5 py-1 text-xs text-ink/50"
                            >
                                #{tag.name}
                            </span>
                        ))}
                    </div>
                )}
            </header>

            <MarkdownBody body={article.body} />

            <div className="flex items-center gap-6 border-y border-ink/10 px-4 py-3 text-ink/30">
                <button
                    onClick={handleLike}
                    disabled={isLikeLoading}
                    aria-pressed={isLiked}
                    aria-label={t("article.like")}
                    className={`flex items-center gap-1.5 rounded-full px-2 py-1.5 transition-colors disabled:opacity-50 ${
                        isLiked
                            ? "text-pink-500"
                            : "hover:bg-ink/5 hover:text-ink/60"
                    }`}
                >
                    <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
                    <span className="text-xs">{likeCount}</span>
                </button>
                <button
                    onClick={handleBookmark}
                    disabled={isBookmarkLoading}
                    aria-pressed={isBookmarked}
                    aria-label={t("article.bookmark")}
                    className={`flex items-center gap-1.5 rounded-full px-2 py-1.5 transition-colors disabled:opacity-50 ${
                        isBookmarked
                            ? "text-blue-400"
                            : "hover:bg-ink/5 hover:text-ink/60"
                    }`}
                >
                    <Bookmark
                        size={16}
                        fill={isBookmarked ? "currentColor" : "none"}
                    />
                </button>
                <button
                    onClick={handleShare}
                    aria-label={t("article.share")}
                    className="flex items-center gap-1.5 rounded-full px-2 py-1.5 transition-colors hover:bg-ink/5 hover:text-ink/60"
                >
                    <Share2 size={16} />
                </button>
                {article.author.isMe && (
                    <Link
                        to={`/articles/${slug}/edit`}
                        aria-label={t("editor.editTitle")}
                        className="ml-auto flex items-center gap-1.5 rounded-full px-2 py-1.5 transition-colors hover:bg-ink/5 hover:text-ink/60"
                    >
                        <Pencil size={16} />
                    </Link>
                )}
            </div>

            <CommentBox
                target={{ type: "article", id: article.id }}
                onCommentCreated={addComment}
            />
            <div className="divide-y divide-ink/10">
                <CommentList
                    comments={comments}
                    isLoading={commentsLoading}
                    error={commentsError}
                    onCommentDeleted={removeComment}
                    onRetry={retryComments}
                    hasMore={hasMoreComments}
                    isLoadingMore={commentsLoadingMore}
                    onLoadMore={loadMoreComments}
                />
            </div>
        </article>
    );
}
