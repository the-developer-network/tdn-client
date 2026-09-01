import { useState } from "react";
import { feedApi } from "../api/feed.api";
import type { Post, QuotedPost } from "../api/feed.types";
import { QuotedPostCard } from "./QuotedPostCard";
import { Modal } from "../../../shared/components/ui/Modal";
import { useAuthStore } from "../../../core/auth/auth.store";
import { useToastStore } from "../../../shared/store/toast.store";
import { getErrorMessage } from "../../../shared/utils/error-handler";
import { useI18n } from "../../../shared/hooks/useI18n";

/** The server's own ceiling on `content`. Enforced here so a 400 is not the
 *  first time the writer hears about it. */
const MAX_LENGTH = 300;

interface QuoteComposerModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** The post being quoted, trimmed to the shape the embedded card renders. */
    quoted: QuotedPost;
    onQuoted: (post: Post) => void;
}

export function QuoteComposerModal({
    isOpen,
    onClose,
    quoted,
    onQuoted,
}: QuoteComposerModalProps) {
    const [content, setContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const user = useAuthStore((state) => state.user);
    const addToast = useToastStore((state) => state.addToast);
    const { t } = useI18n();

    const isTooLong = content.length > MAX_LENGTH;

    const handleClose = () => {
        if (isSubmitting) return;
        onClose();
    };

    const handleSubmit = async () => {
        if (isSubmitting || isTooLong) return;

        setIsSubmitting(true);
        try {
            // Text is optional — an empty `content` alongside a
            // `quotedPostId` is the API's plain repost, and the card renders
            // it as one. Only the untrimmed value is sent for a real quote.
            const post = await feedApi.createPost(
                content.trim(),
                "COMMUNITY",
                [],
                quoted.id,
            );
            onQuoted(post);
            addToast({ type: "info", message: t("quote.success") });
            setContent("");
            onClose();
        } catch (err) {
            addToast({ type: "error", message: getErrorMessage(err) });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose}>
            <div className="px-5 pb-5 pt-14">
                <h3 className="text-lg font-semibold text-ink">
                    {t("quote.title")}
                </h3>

                <div className="mt-4 flex gap-3">
                    <img
                        src={
                            user?.avatarUrl ||
                            `https://ui-avatars.com/api/?name=${user?.username ?? "Guest"}`
                        }
                        alt={user?.username ?? ""}
                        className="h-10 w-10 shrink-0 rounded-full border border-ink/5 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder={t("quote.placeholder")}
                            rows={3}
                            autoFocus
                            className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-ink outline-none placeholder-ink/30"
                        />
                        <QuotedPostCard post={quoted} isPreview />
                    </div>
                </div>

                <div className="mt-5 flex items-center justify-end gap-3 border-t border-ink/5 pt-4">
                    {isTooLong ? (
                        <span className="mr-auto text-xs text-red-400">
                            {t("quote.tooLong", { n: MAX_LENGTH })}
                        </span>
                    ) : (
                        content.length > 0 && (
                            <span className="mr-auto text-xs text-ink/30">
                                {content.length}/{MAX_LENGTH}
                            </span>
                        )
                    )}
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="rounded-full border border-ink/10 px-4 py-2 text-sm font-medium text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink disabled:opacity-50"
                    >
                        {t("common.cancel")}
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting || isTooLong}
                        className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-ground transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {isSubmitting ? t("quote.posting") : t("quote.submit")}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
