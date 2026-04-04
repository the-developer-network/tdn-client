import { useNavigate } from "react-router-dom";
import type { Post, PostType } from "../api/feed.types";
import { usePostActions } from "../hooks/usePostActions";
import { RichText } from "../../../shared/components/ui/RichText";

const BADGE_STYLES: Record<PostType, string> = {
    TECH_NEWS: "border-white/20 text-white/60 bg-white/5",
    SYSTEM_UPDATE: "border-white/20 text-white/60 bg-white/5",
    JOB_POSTING: "border-white/20 text-white/60 bg-white/5",
    COMMUNITY: "border-white/20 text-white/60 bg-white/5",
};

export function PostCard({
    id,
    author,
    content,
    type,
    createdAt,
    mediaUrls,
    likeCount,
    commentCount,
    isLiked,
    isBookmarked = false,
}: Post) {
    const isVideo = (url: string) => /\.(mp4|webm|ogg|mov)$/i.test(url);
    const navigate = useNavigate();

    const {
        isLiked: liked,
        likeCount: likes,
        isLikeLoading,
        handleLike,
        isBookmarked: bookmarked,
        isBookmarkLoading,
        handleBookmark,
        handleShare,
    } = usePostActions(
        isLiked,
        likeCount,
        isBookmarked,
        id,
        `${author.username} post`,
    );

    const handleCardClick = () => {
        navigate(`/post/${id}`);
    };

    return (
        <article
            className="p-4 border-b border-white/10 hover:bg-white/[0.02] transition-colors cursor-pointer"
            onClick={handleCardClick}
        >
            <div className="flex gap-4">
                <img
                    src={
                        author.avatarUrl ||
                        `https://ui-avatars.com/api/?name=${author.username}`
                    }
                    className="h-10 w-10 rounded-full border border-white/5 object-cover shrink-0"
                    alt={author.username}
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                            {author.fullName && (
                                <span className="font-semibold text-white text-sm">
                                    {author.fullName}
                                </span>
                            )}
                            <span className="text-white/40 text-sm">
                                @{author.username}
                            </span>
                        </div>
                        <span className="text-white/20">·</span>
                        <span className="text-white/40 text-sm">
                            {new Date(createdAt).toLocaleDateString("tr-TR", {
                                day: "numeric",
                                month: "short",
                            })}
                        </span>
                        <span
                            className={`ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${BADGE_STYLES[type]}`}
                        >
                            {type.replace("_", " ")}
                        </span>
                    </div>

                    <p className="mt-2 text-[15px] text-white/90 leading-relaxed whitespace-pre-wrap">
                        <RichText text={content} />
                    </p>

                    {mediaUrls.length > 0 && (
                        <div
                            className={`mt-3 rounded-2xl overflow-hidden border border-white/10 bg-[#080808] ${mediaUrls.length > 1 ? "grid grid-cols-2 gap-0.5" : "block"}`}
                        >
                            {mediaUrls.map((url, i) => (
                                <div
                                    key={i}
                                    className={`relative w-full overflow-hidden ${mediaUrls.length === 1 ? "aspect-video" : "aspect-square"}`}
                                >
                                    {isVideo(url) ? (
                                        <video
                                            src={url}
                                            controls
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <img
                                            src={url}
                                            alt=""
                                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                                            loading="lazy"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center justify-between max-w-xs mt-4 text-white/30">
                        {/* Comment */}
                        <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-full hover:bg-white/5 hover:text-white/60 transition-colors">
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                />
                            </svg>
                            <span className="text-xs">{commentCount}</span>
                        </button>

                        {/* Like */}
                        <button
                            onClick={handleLike}
                            disabled={isLikeLoading}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-full transition-colors
            ${
                liked ? "text-pink-500" : "hover:bg-white/5 hover:text-white/60"
            } disabled:opacity-50`}
                        >
                            <svg
                                className="w-4 h-4"
                                fill={liked ? "currentColor" : "none"}
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                                />
                            </svg>
                            <span className="text-xs">{likes}</span>
                        </button>

                        {/* Bookmark */}
                        <button
                            onClick={handleBookmark}
                            disabled={isBookmarkLoading}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-full transition-colors disabled:opacity-50
            ${
                bookmarked
                    ? "text-blue-400"
                    : "text-white/40 hover:bg-white/5 hover:text-white/60"
            }`}
                        >
                            <svg
                                className="w-4 h-4"
                                fill={bookmarked ? "currentColor" : "none"}
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                                />
                            </svg>
                        </button>

                        {/* Share */}
                        <button
                            onClick={handleShare}
                            className="flex items-center gap-1.5 px-2 py-1.5 rounded-full hover:bg-white/5 hover:text-white/60 transition-colors"
                        >
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                                />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </article>
    );
}
