import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Repeat2 } from "lucide-react";
import type { Post, PostType, QuotedPost } from "../api/feed.types";
import { usePostActions } from "../hooks/usePostActions";
import { usePendingMedia } from "../hooks/usePendingMedia";
import { QuotedPostCard } from "./QuotedPostCard";
import { QuoteComposerModal } from "./QuoteComposerModal";
import { useAuthStore } from "../../../core/auth/auth.store";
import { useAuthModalStore } from "../../auth/store/auth-modal.store";
import { RichText } from "../../../shared/components/ui/RichText";
import { Modal } from "../../../shared/components/ui/Modal";
import { useTranslation } from "../../../shared/hooks/useTranslation";
import { hasTextSelection } from "../../../shared/utils/text-selection";
import { useI18n } from "../../../shared/hooks/useI18n";
import { SensitiveMedia } from "../../../shared/components/ui/SensitiveMedia";
import { PendingMedia } from "../../../shared/components/ui/PendingMedia";
import { ReportButton } from "../../report/components/ReportButton";

const BADGE_STYLES: Record<PostType, string> = {
    TECH_NEWS: "border-ink/20 text-ink/60 bg-ink/5",
    SYSTEM_UPDATE: "border-ink/20 text-ink/60 bg-ink/5",
    JOB_POSTING: "border-ink/20 text-ink/60 bg-ink/5",
    COMMUNITY: "border-ink/20 text-ink/60 bg-ink/5",
};

interface PostCardProps extends Post {
    onDeleted?: (postId: string) => void;
    /**
     * Handed the quote the moment the server returns it, so the list this
     * card sits in can show it without waiting out the feed's 60 s cache.
     * Optional: a page with no list to prepend to simply omits it.
     */
    onQuoted?: (post: Post) => void;
    /**
     * Handed a freshly read copy of this post when its pending video resolves.
     * Without one there is nowhere to put the answer, so the placeholder shows
     * the wait but offers no way to end it.
     */
    onUpdated?: (post: Post) => void;
}

export function PostCard({
    id,
    author,
    content,
    mentions,
    type,
    createdAt,
    mediaUrls,
    likeCount,
    commentCount,
    isLiked,
    isBookmarked = false,
    quoteCount = 0,
    quotedPost = null,
    isSensitive,
    mediaPending,
    onUpdated,
    onDeleted,
    onQuoted,
}: PostCardProps) {
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

    const isVideo = (url: string) => /\.(mp4|webm|ogg|mov)$/i.test(url);
    const navigate = useNavigate();
    const { t, locale } = useI18n();
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const { refresh, isRefreshing } = usePendingMedia({
        postId: id,
        mediaPending,
        onUpdated,
    });
    const { openModal } = useAuthModalStore();

    /**
     * A quote with nothing written on it is a plain repost. Rendering the
     * usual text block for it would leave an empty speech bubble above the
     * card, so the row says who reshared it and shows the card alone.
     */
    const isRepost = quotedPost !== null && content.trim() === "";

    const goToProfile = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/profile/${author.username}`);
    };

    const {
        displayContent,
        isTranslated,
        isTranslating: isTranslatingContent,
        translateError,
        showTranslate,
        handleTranslate,
        handleRevert,
    } = useTranslation(content);

    const {
        isLiked: liked,
        likeCount: likes,
        isLikeLoading,
        handleLike,
        isBookmarked: bookmarked,
        isBookmarkLoading,
        handleBookmark,
        handleShare,
        quoteCount: quotes,
        registerQuote,
        isDeleteLoading,
        handleDelete,
    } = usePostActions(
        isLiked,
        likeCount,
        isBookmarked,
        id,
        `${author.username} post`,
        () => onDeleted?.(id),
        quoteCount,
    );

    const handleCardClick = () => {
        if (hasTextSelection()) return;
        navigate(`/post/${id}`);
    };

    const handleOpenQuoteModal = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isAuthenticated) {
            openModal();
            return;
        }
        setIsQuoteModalOpen(true);
    };

    /**
     * This post, in the trimmed shape the embedded card renders. The API
     * sends that shape on a quote it returns; the composer needs it before
     * one exists, so it is projected from the fields already in hand.
     */
    const quotedForComposer: QuotedPost = {
        id,
        content,
        mediaUrls,
        createdAt,
        author,
        // Carried through so the composer's preview covers a sensitive post
        // exactly as the feed does. Quoting is not a way to see it uncovered.
        isSensitive,
        mediaPending,
    };

    const handleQuoted = (post: Post) => {
        registerQuote();
        onQuoted?.(post);
    };

    const handleViewQuotes = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/posts/${id}/quotes`);
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
                className="p-4 border-b border-ink/10 hover:bg-ink/[0.02] transition-colors cursor-pointer"
                onClick={handleCardClick}
            >
                <div className="flex gap-4">
                    {/* `avatarUrl` is NOT NULL in the database and the mapper
                        substitutes a CDN default, so there is nothing to fall
                        back to and nothing to sanitise. */}
                    <img
                        src={author.avatarUrl}
                        className="h-10 w-10 rounded-full border border-ink/5 object-cover shrink-0 cursor-pointer"
                        alt={author.username}
                        onClick={goToProfile}
                    />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <div
                                className="flex items-center gap-1.5 cursor-pointer"
                                onClick={goToProfile}
                            >
                                {author.fullName && (
                                    <span className="font-semibold text-ink text-sm hover:underline">
                                        {author.fullName}
                                    </span>
                                )}
                                <span className="text-ink/40 text-sm hover:underline">
                                    @{author.username}
                                </span>
                            </div>
                            <span className="text-ink/20">·</span>
                            <span className="text-ink/40 text-sm">
                                {new Date(createdAt).toLocaleDateString(
                                    locale,
                                    {
                                        day: "numeric",
                                        month: "short",
                                    },
                                )}
                            </span>
                            <span
                                className={`ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${BADGE_STYLES[type]}`}
                            >
                                {type.replace("_", " ")}
                            </span>
                        </div>

                        {isRepost ? (
                            <div className="mt-1 flex items-center gap-1.5 text-xs text-ink/40">
                                <Repeat2 className="h-4 w-4" />
                                <span>{t("post.reposted")}</span>
                            </div>
                        ) : (
                            <RichText
                                text={displayContent}
                                mentions={mentions}
                                className="mt-2 text-[15px] text-ink/90 leading-relaxed whitespace-pre-wrap"
                            />
                        )}
                        {!isRepost &&
                            (showTranslate ||
                                isTranslated ||
                                translateError) && (
                                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                    {!isTranslated && !translateError && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                void handleTranslate();
                                            }}
                                            disabled={isTranslatingContent}
                                            className="text-xs text-blue-400 hover:underline disabled:opacity-50"
                                        >
                                            {isTranslatingContent
                                                ? t("post.translating")
                                                : t("post.translate")}
                                        </button>
                                    )}
                                    {isTranslated && (
                                        <>
                                            <span className="text-xs text-ink/30">
                                                {t("post.translated")}
                                            </span>
                                            <span className="text-ink/20">
                                                ·
                                            </span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRevert();
                                                }}
                                                className="text-xs text-ink/40 hover:underline"
                                            >
                                                {t("post.showOriginal")}
                                            </button>
                                        </>
                                    )}
                                    {translateError && (
                                        <>
                                            <span className="text-xs text-red-400">
                                                {translateError}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRevert();
                                                }}
                                                className="text-xs text-ink/40 hover:underline"
                                            >
                                                {t("post.dismiss")}
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}

                        {mediaPending && (
                            <PendingMedia
                                onRefresh={onUpdated ? refresh : undefined}
                                isRefreshing={isRefreshing}
                            />
                        )}

                        {mediaUrls.length > 0 && (
                            <SensitiveMedia isSensitive={isSensitive}>
                                <div
                                    className={`mt-3 rounded-2xl overflow-hidden border border-ink/10 bg-[#080808] ${mediaUrls.length > 1 ? "grid grid-cols-2 gap-0.5" : "block"}`}
                                >
                                    {mediaUrls.map((url, i) => (
                                        <div
                                            key={i}
                                            className={`relative w-full overflow-hidden ${mediaUrls.length === 1 ? "aspect-video" : "aspect-square"}`}
                                        >
                                            {isVideo(url) ? (
                                                // Play, seek, volume and
                                                // fullscreen are all clicks
                                                // inside the card. Without this
                                                // the first one navigates away
                                                // and the video cannot be
                                                // operated in the feed at all.
                                                <video
                                                    src={url}
                                                    controls
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
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
                            </SensitiveMedia>
                        )}

                        {quotedPost && <QuotedPostCard post={quotedPost} />}

                        {/*
                            `gap-6` between six controls needs 120px of gutter
                            before a single icon is drawn, which is more than a
                            390px phone has left after the avatar column — the
                            share button hung 20px off the right edge of every
                            card. Below `sm` the row spreads what it has
                            instead of adding up to a fixed width.
                        */}
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-1 gap-y-2 text-ink/30 sm:flex-nowrap sm:justify-start sm:gap-6">
                            <button
                                aria-label={t("post.comments")}
                                className="flex items-center gap-1 px-1.5 py-1.5 rounded-full sm:gap-1.5 sm:px-2 hover:bg-ink/5 hover:text-ink/60 transition-colors"
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
                                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                    />
                                </svg>
                                <span className="text-xs">{commentCount}</span>
                            </button>

                            {/* Two controls, not one: the icon opens the
                                composer, the count opens the list of everyone
                                who already quoted this post. */}
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={handleOpenQuoteModal}
                                    aria-label={t("post.quote")}
                                    title={t("post.quote")}
                                    className="flex items-center gap-1 px-1.5 py-1.5 rounded-full sm:gap-1.5 sm:px-2 hover:bg-ink/5 hover:text-ink/60 transition-colors"
                                >
                                    <Repeat2 className="w-4 h-4" />
                                </button>
                                {quotes > 0 && (
                                    <button
                                        onClick={handleViewQuotes}
                                        aria-label={t("post.viewQuotes")}
                                        title={t("post.viewQuotes")}
                                        className="px-1 py-1.5 rounded-full text-xs hover:text-ink/60 hover:underline transition-colors"
                                    >
                                        {quotes}
                                    </button>
                                )}
                            </div>

                            <button
                                onClick={handleLike}
                                disabled={isLikeLoading}
                                // A label that flipped to "Unlike" would keep
                                // the state in the *name*, which changes what
                                // the control is called mid-interaction.
                                // `aria-pressed` is where toggle state goes.
                                aria-label={t("post.like")}
                                aria-pressed={liked}
                                className={`flex items-center gap-1 px-1.5 py-1.5 rounded-full sm:gap-1.5 sm:px-2 transition-colors disabled:opacity-50 ${
                                    liked
                                        ? "text-pink-500"
                                        : "hover:bg-ink/5 hover:text-ink/60"
                                }`}
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

                            <button
                                onClick={handleBookmark}
                                disabled={isBookmarkLoading}
                                aria-label={t("post.bookmark")}
                                aria-pressed={bookmarked}
                                className={`flex items-center gap-1 px-1.5 py-1.5 rounded-full sm:gap-1.5 sm:px-2 transition-colors disabled:opacity-50 ${
                                    bookmarked
                                        ? "text-blue-400"
                                        : "text-ink/40 hover:bg-ink/5 hover:text-ink/60"
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

                            <button
                                onClick={handleShare}
                                aria-label={t("post.share")}
                                className="flex items-center gap-1 px-1.5 py-1.5 rounded-full sm:gap-1.5 sm:px-2 hover:bg-ink/5 hover:text-ink/60 transition-colors"
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

                            {/* You delete what is yours and report what is
                                not — the API answers a report of your own
                                content with a 400. */}
                            {!author.isMe && (
                                <ReportButton targetKind="POST" targetId={id} />
                            )}

                            {author.isMe && (
                                <button
                                    type="button"
                                    onClick={handleOpenDeleteModal}
                                    disabled={isDeleteLoading}
                                    className="flex items-center gap-1 px-1.5 py-1.5 rounded-full sm:gap-1.5 sm:px-2 text-ink/40 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                                    aria-label={t("post.deleteTitle")}
                                    title={t("post.deleteTitle")}
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
                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-7 0h8"
                                        />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </article>

            {/* Rendered only while open so the textarea is not kept alive,
                and its own `quoted` shape is built from this post rather than
                from `quotedPost` — quoting a quote quotes the outer post. */}
            {isQuoteModalOpen && (
                <QuoteComposerModal
                    isOpen={isQuoteModalOpen}
                    onClose={() => setIsQuoteModalOpen(false)}
                    quoted={quotedForComposer}
                    onQuoted={handleQuoted}
                />
            )}

            <Modal isOpen={isDeleteModalOpen} onClose={handleCloseDeleteModal}>
                <div className="px-6 pb-6 pt-14">
                    <h3 className="text-lg font-semibold text-ink">
                        {t("post.deleteTitle")}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink/50">
                        {t("post.deleteBody")}
                    </p>

                    <div className="mt-6 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={handleCloseDeleteModal}
                            disabled={isDeleteLoading}
                            className="rounded-full border border-ink/10 px-4 py-2 text-sm font-medium text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink disabled:opacity-50"
                        >
                            {t("common.cancel")}
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmDelete}
                            disabled={isDeleteLoading}
                            className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-on-fill transition-colors hover:bg-red-400 disabled:opacity-50"
                        >
                            {isDeleteLoading
                                ? t("common.deleting")
                                : t("common.delete")}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
