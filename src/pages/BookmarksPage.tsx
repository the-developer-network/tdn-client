import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageShell } from "../shared/layout/PageShell";
import { TrendingTopicsWidget } from "../shared/components/TrendingTopicsWidget";
import { PostList } from "../features/feed/components/PostList";
import { useBookmarks } from "../features/feed/hooks/useBookmarks";
import { useAuthStore } from "../core/auth/auth.store";
import { useAuthModalStore } from "../features/auth/store/auth-modal.store";
import { CommentList } from "../features/comment/components/CommentList";

export default function BookmarksPage() {
    const { posts, isLoading, error, comments, removePost } = useBookmarks();
    const navigate = useNavigate();

    const { user, isAuthenticated } = useAuthStore();
    const { openModal, setStep } = useAuthModalStore();

    useEffect(() => {
        if (!isAuthenticated) {
            setStep("login");
            openModal();
            navigate("/", { replace: true });
        }
    }, [isAuthenticated, navigate, openModal, setStep]);

    if (!isAuthenticated) return null;

    return (
        <PageShell rightRail={<TrendingTopicsWidget />}>
            {/*  Header */}
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 py-4">
                <h1 className="text-xl font-bold text-white">Bookmarks</h1>
                {/* Username */}
                <p className="text-sm text-white/40 mt-1">
                    @{user?.username} (Posts & comments you saved)
                </p>
            </div>

            {/* (Empty State) */}
            {posts.length === 0 &&
            comments.length === 0 &&
            !isLoading &&
            !error ? (
                <div className="flex flex-col items-center justify-center p-12 text-center border-b border-white/10">
                    <div className="w-16 h-16 rounded-full border border-white/10 bg-white/5 flex items-center justify-center mb-4">
                        <svg
                            className="w-8 h-8 text-white/40"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                            />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">
                        Save posts for later
                    </h2>
                    <p className="text-white/40 text-[15px] max-w-[250px]">
                        Don't let the good ones get away! Bookmark posts to
                        easily find them again in the future.
                    </p>
                </div>
            ) : (
                <>
                    <PostList
                        posts={posts}
                        isLoading={isLoading}
                        error={error}
                        onPostDeleted={removePost}
                    />
                    <CommentList
                        comments={comments}
                        isLoading={isLoading}
                        error={error}
                    />
                </>
            )}
        </PageShell>
    );
}
