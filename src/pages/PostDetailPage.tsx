import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { feedApi } from "../features/feed/api/feed.api";
import type { Post } from "../features/feed/api/feed.types";
import { PostCard } from "../features/feed/components/PostCard";
import { Sidebar } from "../shared/layout/Sidebar";
import { CommentBox } from "../features/comment/components/CommentBox";
import { useComments } from "../features/comment/hooks/useComments";
import { CommentList } from "../features/comment/components/CommentList";
import { AuthModal } from "../features/auth/components/AuthModal";

export default function PostDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [post, setPost] = useState<Post | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const {
        comments,
        isLoading: commentsLoading,
        fetchComments,
        addComment,
        removeComment,
    } = useComments(id!);

    useEffect(() => {
        if (!id) return;

        const fetchPost = async () => {
            try {
                setIsLoading(true);
                const data = await feedApi.getPostById(id);
                setPost(data);
            } catch (error) {
                console.error("Post Load Failed:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPost();
        fetchComments();
    }, [id, fetchComments]);

    return (
        <div className="flex justify-center min-h-screen bg-black">
            <div className="flex w-full max-w-[1250px]">
                <div className="hidden sm:block w-[275px] shrink-0">
                    <Sidebar />
                </div>

                <main className="flex-1 max-w-[600px] border-x border-white/10 min-h-screen">
                    <div
                        className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center gap-6 cursor-pointer"
                        onClick={() => navigate(-1)}
                    >
                        <button className="text-white hover:bg-white/10 p-2 -ml-2 rounded-full transition-colors">
                            <svg
                                width="20"
                                height="20"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                                />
                            </svg>
                        </button>
                        <h2 className="text-xl font-bold text-white tracking-wide">
                            Post
                        </h2>
                    </div>

                    {isLoading ? (
                        <div className="p-8 flex justify-center items-center h-40">
                            <div className="w-8 h-8 border-4 border-white/10 border-t-white rounded-full animate-spin" />
                        </div>
                    ) : post ? (
                        <div>
                            <PostCard
                                {...post}
                                onDeleted={() => {
                                    navigate("/", { replace: true });
                                }}
                            />
                            <CommentBox
                                postId={post.id}
                                onCommentCreated={addComment}
                            />
                            <div className="divide-y divide-white/10">
                                <CommentList
                                    comments={comments}
                                    isLoading={commentsLoading}
                                    error={null}
                                    onCommentDeleted={removeComment}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-white/40">
                            Post not found.
                        </div>
                    )}
                </main>
            </div>
            <AuthModal />
        </div>
    );
}
