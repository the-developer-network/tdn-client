import { useState, useRef } from "react";
import { useAuthStore } from "../../../core/auth/auth.store";
import { useAuthModalStore } from "../../auth/store/auth-modal.store";
import { feedApi } from "../api/feed.api";
import type { Post, PostType } from "../api/feed.types";

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

    const { user, isAuthenticated } = useAuthStore();
    const { openModal, setStep } = useAuthModalStore();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = Array.from(e.target.files || []);
        const merged = [...files, ...selected].slice(0, MAX_FILES);
        setFiles(merged);
        setPreviews(merged.map((f) => URL.createObjectURL(f)));
        e.target.value = "";
    };

    const removeFile = (index: number) => {
        const newFiles = files.filter((_, i) => i !== index);
        const newPreviews = previews.filter((_, i) => i !== index);
        setFiles(newFiles);
        setPreviews(newPreviews);
    };

    const handleSubmit = async () => {
        if ((!content.trim() && files.length === 0) || isSubmitting) return;

        if (!isAuthenticated) {
            setStep("login");
            openModal();
            return;
        }

        setIsSubmitting(true);
        try {
            let mediaUrls: string[] = [];

            if (files.length > 0) {
                setIsUploading(true);
                const res = await feedApi.uploadMedia(files);
                mediaUrls = res.mediaUrls;
                setIsUploading(false);
            }

            const post = await feedApi.createPost(
                content,
                activeCategory,
                mediaUrls,
            );
            onPostCreated(post);
            setContent("");
            setFiles([]);
            setPreviews([]);
        } catch (err) {
            console.error(err);
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
                        user?.avatarUrl ||
                        (user
                            ? `https://ui-avatars.com/api/?name=${user.username}`
                            : `https://ui-avatars.com/api/?name=Guest&background=random`)
                    }
                    className="h-10 w-10 rounded-full border border-white/5 object-cover shrink-0"
                    alt="User avatar"
                />
                <div className="flex-1 flex flex-col gap-3">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder={
                            isAuthenticated
                                ? "What are you building today?"
                                : "Sign in to share your thoughts..."
                        }
                        rows={3}
                        className="w-full bg-transparent text-white placeholder-white/30 resize-none outline-none text-[15px] leading-relaxed"
                    />

                    {/* Preview */}
                    {previews.length > 0 && (
                        <div
                            className={`grid gap-1 rounded-2xl overflow-hidden ${previews.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
                        >
                            {previews.map((url, i) => (
                                <div
                                    key={i}
                                    className="relative aspect-video bg-white/5"
                                >
                                    <img
                                        src={url}
                                        className="w-full h-full object-cover"
                                        alt=""
                                    />
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
                            ))}
                        </div>
                    )}

                    <div className="flex items-center justify-between border-t border-white/5 pt-3">
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
                                className="flex items-center gap-1.5 px-2 py-1.5 rounded-full text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
                                        : "Media"}
                                </span>
                            </button>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={
                                (!content.trim() && files.length === 0) ||
                                isSubmitting
                            }
                            className="bg-white text-black text-sm font-semibold px-5 py-2 rounded-full hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {isUploading
                                ? "Uploading..."
                                : isSubmitting
                                  ? "Posting..."
                                  : "Post"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
