import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "../../../core/auth/auth.store";
import { commentApi } from "../api/comment.api";
import { feedApi } from "../../feed/api/feed.api";
import type { Comment, CommentTarget } from "../api/comment.types";
import { useAuthModalStore } from "../../auth/store/auth-modal.store";
import { useI18n } from "../../../shared/hooks/useI18n";
import { useToastStore } from "../../../shared/store/toast.store";
import { getErrorMessage } from "../../../shared/utils/error-handler";

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
                const res = await feedApi.uploadMedia(files);
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
            addToast({ type: "error", message: getErrorMessage(err) });
        } finally {
            setIsSubmitting(false);
            setIsUploading(false);
        }
    };

    return (
        <div className="p-4 border-b border-white/10">
            <div className="flex gap-3">
                <img
                    src={
                        user?.avatarUrl || `https://ui-avatars.com/api/?name=?`
                    }
                    className="h-9 w-9 rounded-full border border-white/5 object-cover shrink-0"
                />
                <div className="flex-1 flex flex-col gap-3">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder={placeholder ?? t("commentBox.placeholder")}
                        rows={2}
                        className="w-full bg-transparent text-white placeholder-white/30 resize-none outline-none text-[15px] leading-relaxed"
                    />

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
                                return (
                                    <div
                                        key={i}
                                        className="relative aspect-video bg-white/5"
                                    >
                                        {isVideo ? (
                                            <video
                                                src={url}
                                                controls
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <img
                                                src={url}
                                                className="w-full h-full object-cover"
                                                alt=""
                                            />
                                        )}
                                        <button
                                            onClick={() => removeFile(i)}
                                            className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black rounded-full p-1 transition-colors"
                                        >
                                            <svg
                                                className="w-3.5 h-3.5 text-white"
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

                    <div className="flex items-center justify-between border-t border-white/5 pt-3">
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
                                className="flex items-center gap-1.5 px-2 py-1.5 rounded-full text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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

                        <button
                            onClick={handleSubmit}
                            disabled={
                                (isAuthenticated &&
                                    !content.trim() &&
                                    files.length === 0) ||
                                isSubmitting
                            }
                            className="bg-white text-black text-sm font-semibold px-4 py-1.5 rounded-full hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
