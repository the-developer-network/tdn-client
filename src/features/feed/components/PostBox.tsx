import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "../../../core/auth/auth.store";
import { useAuthModalStore } from "../../auth/store/auth-modal.store";
import { feedApi } from "../api/feed.api";
import type { Post, PostType } from "../api/feed.types";
import { useToastStore } from "../../../shared/store/toast.store";
import { getErrorMessage } from "../../../shared/utils/error-handler";
import {
    clearsSelection,
    withModerationRetry,
} from "../../../shared/utils/media-errors";
import { useMentionLimit } from "../../../shared/hooks/useMentionLimit";
import { useMentionAutocomplete } from "../../../shared/hooks/useMentionAutocomplete";
import { MentionSuggestions } from "../../../shared/components/ui/MentionSuggestions";
import { useI18n } from "../../../shared/hooks/useI18n";
import { getSafeImageSrc } from "../../../shared/utils/image-src";

interface PostBoxProps {
    onPostCreated: (post: Post) => void;
    activeCategory: PostType;
}

const MAX_FILES = 4;

export function PostBox({ onPostCreated, activeCategory }: PostBoxProps) {
    const [content, setContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { user, isAuthenticated } = useAuthStore();
    const { openModal } = useAuthModalStore();
    const addToast = useToastStore((state) => state.addToast);
    const { t } = useI18n();
    // Mirrors the server's ten-handle cap so its 400 stays unreachable.
    const { isOverLimit: isOverMentionLimit, max: maxMentions } =
        useMentionLimit(content);
    const mention = useMentionAutocomplete({
        value: content,
        onChange: setContent,
        inputRef: textareaRef,
    });

    const autoResize = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
    };

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
        if ((!content.trim() && files.length === 0) || isSubmitting) return;

        if (!isAuthenticated) {
            openModal();
            return;
        }

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

            const post = await feedApi.createPost(
                content,
                activeCategory,
                mediaUrls,
            );
            onPostCreated(post);
            previews.forEach((url) => URL.revokeObjectURL(url));
            setContent("");
            setFiles([]);
            setPreviews([]);
            if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
            }
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
                        user?.avatarUrl ||
                        (user
                            ? `https://ui-avatars.com/api/?name=${user.username}`
                            : `https://ui-avatars.com/api/?name=Guest&background=random`)
                    }
                    className="h-10 w-10 rounded-full border border-ink/5 object-cover shrink-0"
                    alt="User avatar"
                />
                <div className="flex-1 flex flex-col gap-3">
                    {/*
                     * `relative` wraps the field alone. Wrapping the column
                     * put the list below the media previews and the toolbar —
                     * 65px and a whole row away from the text it belonged to.
                     */}
                    <div className="relative">
                        <textarea
                            ref={textareaRef}
                            value={content}
                            onChange={(e) => {
                                setContent(e.target.value);
                                autoResize();
                                mention.sync();
                            }}
                            onKeyDown={(e) => mention.onKeyDown(e)}
                            onBlur={mention.close}
                            placeholder={
                                isAuthenticated
                                    ? t("postBox.placeholder")
                                    : t("postBox.placeholderGuest")
                            }
                            rows={3}
                            className="w-full bg-transparent text-ink placeholder-ink/30 resize-none outline-none text-[15px] leading-relaxed overflow-hidden"
                        />
                        {/*
                         * Anchored to the column rather than the caret: a textarea
                         * gives no caret coordinates without measuring a mirror
                         * element, and under the field is where the list is looked
                         * for anyway.
                         */}
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

                    {/* Preview */}
                    {previews.length > 0 && (
                        <div
                            className={`grid gap-1 rounded-2xl overflow-hidden ${previews.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
                        >
                            {previews.map((url, i) => {
                                const safeUrl = getSafeImageSrc(url);
                                return (
                                    <div
                                        key={i}
                                        className="relative aspect-video bg-ink/5"
                                    >
                                        {safeUrl && (
                                            <img
                                                src={safeUrl}
                                                className="w-full h-full object-cover"
                                                alt=""
                                            />
                                        )}
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
                            {/* Media Button */}
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
                                    className="w-5 h-5"
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
                                <span className="text-sm">
                                    {files.length > 0
                                        ? `${files.length}/${MAX_FILES}`
                                        : t("postBox.media")}
                                </span>
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
                                (!content.trim() && files.length === 0) ||
                                isSubmitting ||
                                isOverMentionLimit
                            }
                            className="bg-ink text-ground text-sm font-semibold px-5 py-2 rounded-full hover:bg-ink/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {isUploading
                                ? t("postBox.uploading")
                                : isSubmitting
                                  ? t("postBox.posting")
                                  : t("postBox.post")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
