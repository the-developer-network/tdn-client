import { useNavigate } from "react-router-dom";
import type { QuotedPost } from "../api/feed.types";
import { RichText } from "../../../shared/components/ui/RichText";
import { hasTextSelection } from "../../../shared/utils/text-selection";
import { useI18n } from "../../../shared/hooks/useI18n";

interface QuotedPostCardProps {
    post: QuotedPost;
    /**
     * Set on the preview inside the composer, where the card is context for
     * what is about to be written rather than something to click through.
     */
    isPreview?: boolean;
}

const isVideo = (url: string) => /\.(mp4|webm|ogg|mov)$/i.test(url);

/**
 * The post embedded inside a quote.
 *
 * Two limits come straight from the payload and shape the whole component:
 * it carries no counters and no `isLiked`/`isBookmarked`, so there is nothing
 * to act on and no action row; and it never carries a `quotedPost` of its own,
 * so this never nests.
 */
export function QuotedPostCard({
    post,
    isPreview = false,
}: QuotedPostCardProps) {
    const navigate = useNavigate();
    const { locale } = useI18n();

    const handleClick = (e: React.MouseEvent) => {
        // The card lives inside a `PostCard` that navigates on click. Without
        // this the outer handler wins and the quoted post is unreachable.
        e.stopPropagation();
        if (isPreview) return;
        if (hasTextSelection()) return;
        navigate(`/post/${post.id}`);
    };

    return (
        <div
            onClick={handleClick}
            className={`mt-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3 ${
                isPreview
                    ? ""
                    : "cursor-pointer transition-colors hover:bg-white/[0.05]"
            }`}
        >
            <div className="flex items-center gap-2">
                <img
                    src={post.author.avatarUrl}
                    alt={post.author.username}
                    className="h-5 w-5 shrink-0 rounded-full border border-white/5 object-cover"
                />
                {post.author.fullName && (
                    <span className="truncate text-sm font-semibold text-white">
                        {post.author.fullName}
                    </span>
                )}
                <span className="truncate text-sm text-white/40">
                    @{post.author.username}
                </span>
                <span className="text-white/20">·</span>
                <span className="shrink-0 text-sm text-white/40">
                    {new Date(post.createdAt).toLocaleDateString(locale, {
                        day: "numeric",
                        month: "short",
                    })}
                </span>
            </div>

            {post.content && (
                <RichText
                    text={post.content}
                    className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-white/70"
                />
            )}

            {post.mediaUrls.length > 0 && (
                <div
                    className={`mt-2 overflow-hidden rounded-xl border border-white/10 bg-[#080808] ${
                        post.mediaUrls.length > 1
                            ? "grid grid-cols-2 gap-0.5"
                            : "block"
                    }`}
                >
                    {post.mediaUrls.map((url, i) => (
                        <div
                            key={i}
                            className={`relative w-full overflow-hidden ${
                                post.mediaUrls.length === 1
                                    ? "aspect-video"
                                    : "aspect-square"
                            }`}
                        >
                            {isVideo(url) ? (
                                // No `controls` here: the embedded card is a
                                // link to the original, and a control strip
                                // would put play/seek targets on top of it.
                                <video
                                    src={url}
                                    muted
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <img
                                    src={url}
                                    alt=""
                                    loading="lazy"
                                    className="h-full w-full object-cover"
                                />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
