import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Comment } from "../api/comment.types";
import { useCommentActions } from "../hooks/useCommentActions";
import { RichText } from "../../../shared/components/ui/RichText";
import { Modal } from "../../../shared/components/ui/Modal";

interface CommentCardProps {
    comment: Comment;
    onDeleted?: (commentId: string) => void;
}

export function CommentCard({ comment, onDeleted }: CommentCardProps) {
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const { author, content, mediaUrls, createdAt, replyCount, id } = comment;

    const {
        isLiked,
        likeCount,
        isLikeLoading,
        handleLike,
        isBookmarked,
        isBookmarkLoading,
        handleSave,
        handleShare,
        isDeleteLoading,
        handleDelete,
    } = useCommentActions(
        comment.isLiked,
        comment.likeCount,
        comment.isBookmarked,
        comment.id,
        () => onDeleted?.(comment.id),
    );

    const navigate = useNavigate();

    if (!author) return null;

    const isVideo = (url: string) => /\.(mp4|webm|ogg|mov)$/i.test(url);

    const handleCardClick = () => {
        navigate(`/comments/${id}`);
    };

    const handleOpenDeleteModal = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDeleteModalOpen(true);
    };

    const handleCloseDeleteModal = () => {
        if (isDeleteLoading) return;
        setIsDeleteModalOpen(false);
    };

    const handleConfirmDelete = async () => {
        const isDeleted = await handleDelete();

        if (isDeleted) {
            setIsDeleteModalOpen(false);
        }
    };

    return (
        <>
            <article
                className="p-4 border-b border-white/10 hover:bg-white/[0.02] transition-colors cursor-pointer"
                onClick={handleCardClick}
            >
                <div className="flex gap-3">
                    <img
                        src={
                            author.avatarUrl ||
                            `https://ui-avatars.com/api/?name=${author.username}`
                        }
                        className="h-9 w-9 rounded-full border border-white/5 object-cover shrink-0"
                        alt={author.username}
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
                                {new Date(createdAt).toLocaleDateString(
                                    "tr-TR",
                                    {
                                        day: "numeric",
                                        month: "short",
                                    },
                                )}
                            </span>
                        </div>

                        <RichText
                            text={content}
                            className="mt-1.5 text-[15px] text-white/90 leading-relaxed whitespace-pre-wrap"
                        />

                        {mediaUrls && mediaUrls.length > 0 && (
                            <div
                                className={`mt-3 rounded-2xl overflow-hidden border border-white/10 bg-[#080808] ${mediaUrls.length > 1 ? "grid grid-cols-2 gap-0.5" : "block"}`}
                            >
                                {mediaUrls.map((url, index) => (
                                    <div
                                        key={index}
                                        className={`relative w-full overflow-hidden ${mediaUrls.length === 1 ? "aspect-video" : "aspect-square"}`}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {isVideo(url) ? (
                                            <video
                                                src={url}
                                                controls
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <img
                                                src={url}
                                                alt=""
                                                className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                                                loading="lazy"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mt-3 flex items-center gap-18 text-white/30">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/comments/${id}`);
                                }}
                                className="flex items-center gap-1.5 rounded-full px-2 py-1.5 transition-colors hover:bg-white/5 hover:text-white/60"
                            >
                                <svg
                                    className="h-4 w-4"
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
                                <span className="text-xs">{replyCount}</span>
                            </button>

                            <button
                                onClick={handleLike}
                                disabled={isLikeLoading}
                                className={`flex items-center gap-1.5 rounded-full px-2 py-1.5 transition-colors disabled:opacity-50 ${
                                    isLiked
                                        ? "text-pink-500"
                                        : "hover:bg-white/5 hover:text-white/60"
                                }`}
                            >
                                <svg
                                    className="h-4 w-4"
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

                            <button
                                onClick={handleSave}
                                disabled={isBookmarkLoading}
                                className={`flex items-center gap-1.5 rounded-full px-2 py-1.5 transition-colors disabled:opacity-50 ${
                                    isBookmarked
                                        ? "text-blue-400"
                                        : "hover:bg-white/5 hover:text-white/60"
                                }`}
                            >
                                <svg
                                    className="h-4 w-4"
                                    fill={
                                        isBookmarked ? "currentColor" : "none"
                                    }
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

                            <button
                                onClick={handleShare}
                                className="flex items-center gap-1.5 rounded-full px-2 py-1.5 transition-colors hover:bg-white/5 hover:text-white/60"
                            >
                                <svg
                                    className="h-4 w-4"
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

                            {author.isMe && (
                                <button
                                    type="button"
                                    onClick={handleOpenDeleteModal}
                                    disabled={isDeleteLoading}
                                    className="flex items-center gap-1.5 rounded-full px-2 py-1.5 text-white/40 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                                    aria-label="Delete comment"
                                    title="Delete comment"
                                >
                                    <svg
                                        className="h-4 w-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-7 0h8"
                                        />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </article>

            <Modal isOpen={isDeleteModalOpen} onClose={handleCloseDeleteModal}>
                <div className="px-6 pb-6 pt-14">
                    <h3 className="text-lg font-semibold text-white">
                        Delete comment?
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/50">
                        This action cannot be undone. The comment will be
                        permanently removed.
                    </p>

                    <div className="mt-6 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={handleCloseDeleteModal}
                            disabled={isDeleteLoading}
                            className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmDelete}
                            disabled={isDeleteLoading}
                            className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-400 disabled:opacity-50"
                        >
                            {isDeleteLoading ? "Deleting..." : "Delete"}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
