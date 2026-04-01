import { useState } from "react";
import { useAuthStore } from "../../../core/auth/auth.store";
import { feedApi } from "../api/feed.api";
import type { Post } from "../api/feed.types";

interface PostBoxProps {
    onPostCreated: (post: Post) => void;
}

export function PostBox({ onPostCreated }: PostBoxProps) {
    const [content, setContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { user } = useAuthStore();

    const handleSubmit = async () => {
        if (!content.trim() || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const post = await feedApi.createPost(content, "COMMUNITY");
            onPostCreated(post);
            setContent("");
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-4 border-b border-white/10">
            <div className="flex gap-3">
                <img
                    src={
                        user?.avatarUrl ||
                        `https://ui-avatars.com/api/?name=${user?.username}`
                    }
                    className="h-10 w-10 rounded-full border border-white/5 object-cover shrink-0"
                />
                <div className="flex-1 flex flex-col gap-3">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="What are you building today?"
                        rows={3}
                        className="w-full bg-transparent text-white placeholder-white/30 resize-none outline-none text-[15px] leading-relaxed"
                    />

                    <div className="flex items-center justify-between border-t border-white/5 pt-3">
                        {/* Media */}
                        <button
                            disabled
                            className="flex items-center gap-2 text-white/30 text-sm cursor-not-allowed"
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
                            <span>Media</span>
                        </button>

                        <button
                            onClick={handleSubmit}
                            disabled={!content.trim() || isSubmitting}
                            className="bg-white text-black text-sm font-semibold px-5 py-2 rounded-full hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? "Posting..." : "Post"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
