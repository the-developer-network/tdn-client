import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "../../../core/auth/auth.store";
import { commentApi } from "../api/comment.api";
import { feedApi } from "../../feed/api/feed.api";
import type { Comment, CommentTarget } from "../api/comment.types";
import { useAuthModalStore } from "../../auth/store/auth-modal.store";
import { useMentionLimit } from "../../../shared/hooks/useMentionLimit";
import { useMentionAutocomplete } from "../../../shared/hooks/useMentionAutocomplete";
import { MentionSuggestions } from "../../../shared/components/ui/MentionSuggestions";
import { useI18n } from "../../../shared/hooks/useI18n";
import { useToastStore } from "../../../shared/store/toast.store";
import { getSafeImageSrc } from "../../../shared/utils/image-src";
import { getErrorMessage } from "../../../shared/utils/error-handler";
import {
    clearsSelection,
    withModerationRetry,
} from "../../../shared/utils/media-errors";

interface CommentBoxProps {
    target: CommentTarget;
    parentId?: string;
    onCommentCreated: (comment: Comment) => void;
    placeholder?: string;
}

const MAX_FILES = 4;

export function CommentBox({
    target,
    parentId,
    onCommentCreated,
    placeholder,
}: CommentBoxProps) {
    const { t } = useI18n();
    const [content, setContent] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    // Mirrors the server's ten-handle cap so its 400 stays unreachable.
    const { isOverLimit: isOverMentionLimit, max: maxMentions } =
        useMentionLimit(content);
    const mention = useMentionAutocomplete({
        value: content,
        onChange: setContent,
        inputRef: textareaRef,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { user, isAuthenticated } = useAuthStore();
    const { openModal } = useAuthModalStore();
    const addToast = useToastStore((state) => state.addToast);

    // Object URLs must be revoked or every attachment leaks for the life of the
    // page. Created and released in handlers rather than an effect, so React
    // StrictMode's double render cannot mint a second set and orphan the first.
    const previewsRef = useRef<string[]>([]);
    useEffect(() => {
        previewsRef.current = previews;
    }, [previews]);
    useEffect(
        () => () =>
            previewsRef.current.forEach((url) => URL.revokeObjectURL(url)),
        [],
    );

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = Array.from(e.target.files || []);
        const added = selected.slice(0, Math.max(0, MAX_FILES - files.length));
        // Only new files get a URL. Re-mapping every merged file, as this used
        // to, minted a fresh URL for ones that already had a preview and leaked
        // the old one on every attachment.
        const addedUrls = added.map((file) => URL.createObjectURL(file));

        setFiles((prev) => [...prev, ...added]);
        setPreviews((prev) => [...prev, ...addedUrls]);
        e.target.value = "";
    };

    const removeFile = (index: number) => {
        const url = previews[index];
        if (url) URL.revokeObjectURL(url);
        setFiles((prev) => prev.filter((_, i) => i !== index));
        setPreviews((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!isAuthenticated) {
            openModal("identifier");
            return;
        }
        if ((!content.trim() && files.length === 0) || isSubmitting) return;
        setIsSubmitting(true);
        try {
            let mediaUrls: string[] = [];
            if (files.length > 0) {
                setIsUploading(true);
                const res = await withModerationRetry(() =>
                    feedApi.uploadMedia(files),
                );
                mediaUrls = res.mediaUrls;
                setIsUploading(false);
            }
            const comment = await commentApi.createComment(target, {
                content,
                mediaUrls,
                ...(parentId ? { parentId } : {}),
            });
            onCommentCreated(comment);
            previews.forEach((url) => URL.revokeObjectURL(url));
            setContent("");
            setFiles([]);
            setPreviews([]);
        } catch (err) {
            /*
             * A verdict makes the selection unusable: the endpoint processes
             * the files in order and returns no URLs at all once one is
             * rejected, so even the files that uploaded before it have no
             * URL to send. Nothing here knows which file it was, so all of
             * them go and the person picks again.
             *
             * Everything else keeps them — a 503 was retried once already and
             * is still worth another try by hand, and a failure from the
             * create call that follows says nothing about the files.
             */
            if (clearsSelection(err)) {
                previews.forEach((url) => URL.revokeObjectURL(url));
                setFiles([]);
                setPreviews([]);
            }
            addToast({ type: "error", message: getErrorMessage(err) });
        } finally {
            setIsSubmitting(false);
            setIsUploading(false);
        }
    };

    return (
        <div className="p-4 border-b border-ink/10">
            <div className="flex gap-3">
                <img
                    src={
                        user?.avatarUrl || `https://ui-avatars.com/api/?name=?`
                    }
                    className="h-9 w-9 rounded-full border border-ink/5 object-cover shrink-0"
                />
                <div className="flex-1 flex flex-col gap-3">
                    {/*
                     * `relative` wraps the field alone — see `PostBox`: around
                     * the column the list lands under everything else in it.
                     */}
                    <div className="relative">
                        <textarea
                            ref={textareaRef}
                            value={content}
                            onChange={(e) => {
                                setContent(e.target.value);
                                mention.sync();
                            }}
                            onKeyDown={(e) => mention.onKeyDown(e)}
                            onBlur={mention.close}
                            placeholder={
                                placeholder ?? t("commentBox.placeholder")
                            }
                            rows={2}
                            className="w-full bg-transparent text-ink placeholder-ink/30 resize-none outline-none text-[15px] leading-relaxed"
                        />
                        <MentionSuggestions
                            isOpen={mention.isOpen}
                            isLoading={mention.isLoading}
                            results={mention.results}
                            highlighted={mention.highlighted}
                            onHighlight={mention.setHighlighted}
                            onSelect={mention.select}
                            point={mention.point}
                            fieldRef={textareaRef}
                        />
                    </div>

                    {previews.length > 0 && (
                        <div
                            className={`grid gap-1 rounded-2xl overflow-hidden ${previews.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
                        >
                            {previews.map((url, i) => {
                                // `previews[i]` is the object URL of `files[i]`
                                // — both arrays are appended to and filtered in
                                // the same handlers. The picker takes video as
                                // well as images, and an <img> cannot render
                                // one: it drew a broken image over the file the
                                // reader had just chosen.
                                const isVideo =
                                    files[i].type.startsWith("video/");
                                // `createObjectURL` yields a blob: URL, which
                                // this allows — but the value still goes
                                // through the guard rather than straight into
                                // src, so the element cannot become a sink if
                                // the preview list ever carries anything else.
                                const safeUrl = getSafeImageSrc(url);
                                return (
                                    <div
                                        key={i}
                                        className="relative aspect-video bg-ink/5"
                                    >
                                        {safeUrl &&
                                            (isVideo ? (
                                                <video
                                                    src={safeUrl}
                                                    controls
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <img
                                                    src={safeUrl}
                                                    className="w-full h-full object-cover"
                                                    alt=""
                                                />
                                            ))}
                                        <button
                                            onClick={() => removeFile(i)}
                                            className="absolute top-1.5 right-1.5 bg-scrim/60 hover:bg-scrim rounded-full p-1 transition-colors"
                                        >
                                            <svg
                                                className="w-3.5 h-3.5 text-on-fill"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M6 18L18 6M6 6l12 12"
                                                />
                                            </svg>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="flex items-center justify-between border-t border-ink/5 pt-3">
                        <div className="flex items-center gap-1">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,video/*"
                                multiple
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={files.length >= MAX_FILES}
                                className="flex items-center gap-1.5 px-2 py-1.5 rounded-full text-ink/40 hover:text-ink/70 hover:bg-ink/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
                                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                </svg>
                                {files.length > 0 && (
                                    <span className="text-xs">
                                        {files.length}/{MAX_FILES}
                                    </span>
                                )}
                            </button>
                        </div>

                        {isOverMentionLimit && (
                            <p className="mt-2 text-xs text-red-400">
                                {t("error.mentionLimit", {
                                    max: String(maxMentions),
                                })}
                            </p>
                        )}
                        <button
                            onClick={handleSubmit}
                            disabled={
                                (isAuthenticated &&
                                    !content.trim() &&
                                    files.length === 0) ||
                                isSubmitting ||
                                isOverMentionLimit
                            }
                            className="bg-ink text-ground text-sm font-semibold px-4 py-1.5 rounded-full hover:bg-ink/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {isUploading
                                ? t("commentBox.uploading")
                                : isSubmitting
                                  ? t("commentBox.posting")
                                  : t("commentBox.reply")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
