import type { Comment } from "../api/comment.types";
import { useCommentActions } from "../hooks/useCommentActions";

interface CommentCardProps {
    comment: Comment;
}

export function CommentCard({ comment }: CommentCardProps) {
    const { author, content, mediaUrls, createdAt } = comment;

    const { isLiked, likeCount, isLikeLoading, handleLike } = useCommentActions(
        comment.isLiked,
        comment.likeCount,
        comment.id,
    );

    if (!author) return null;

    const isVideo = (url: string) => /\.(mp4|webm|ogg|mov)$/i.test(url);

    return (
        <article className="p-4 border-b border-white/10 hover:bg-white/[0.02] transition-colors">
            <div className="flex gap-3">
                <img
                    src={
                        author.avatarUrl ||
                        `https://ui-avatars.com/api/?name=${author.username}`
                    }
                    className="h-9 w-9 rounded-full border border-white/5 object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {author.fullName && (
                            <span className="font-semibold text-white text-sm">
                                {author.fullName}
                            </span>
                        )}
                        <span className="text-white/40 text-sm">
                            @{author.username}
                        </span>
                        <span className="text-white/20">·</span>
                        <span className="text-white/40 text-xs">
                            {new Date(createdAt).toLocaleDateString("tr-TR", {
                                day: "numeric",
                                month: "short",
                            })}
                        </span>
                    </div>

                    <p className="mt-1.5 text-[15px] text-white/90 leading-relaxed whitespace-pre-wrap">
                        {content}
                    </p>

                    {mediaUrls && mediaUrls.length > 0 && (
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

                    <div className="flex items-center justify-between max-w-xs mt-3 text-white/30">
                        <button
                            onClick={handleLike}
                            disabled={isLikeLoading}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-full transition-colors disabled:opacity-50 ${
                                isLiked
                                    ? "text-pink-500"
                                    : "hover:bg-white/5 hover:text-white/60"
                            }`}
                        >
                            <svg
                                className="w-4 h-4"
                                fill={isLiked ? "currentColor" : "none"}
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
                            <span className="text-xs">{likeCount}</span>
                        </button>

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
                                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                                />
                            </svg>
                        </button>

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
