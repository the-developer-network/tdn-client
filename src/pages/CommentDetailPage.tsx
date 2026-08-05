import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageShell } from "../shared/layout/PageShell";
import { TrendingTopicsWidget } from "../shared/components/TrendingTopicsWidget";
import { commentApi } from "../features/comment/api/comment.api";
import type { Comment } from "../features/comment/api/comment.types";
import { CommentCard } from "../features/comment/components/CommentCard";
import { Button } from "../shared/components/ui/Button";
import { useCommentReplies } from "../features/comment/hooks/useCommentReplies";
import { CommentBox } from "../features/comment/components/CommentBox";
import { useI18n } from "../shared/hooks/useI18n";

export default function CommentDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useI18n();

    const [comment, setComment] = useState<Comment | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const {
        replies,
        isLoading: repliesLoading,
        isLoadingMore: repliesLoadingMore,
        hasMore: hasMoreReplies,
        error: repliesError,
        fetchReplies,
        loadMore: loadMoreReplies,
        addReply,
        removeReply,
    } = useCommentReplies(id!);

    const handleBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
            return;
        }

        if (comment) {
            navigate(`/post/${comment.postId}`);
            return;
        }

        navigate("/", { replace: true });
    };

    useEffect(() => {
        if (!id) return;

        const fetchComment = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const data = await commentApi.getCommentById(id);
                setComment(data);
            } catch {
                setError(t("page.commentError"));
            } finally {
                setIsLoading(false);
            }
        };

        fetchReplies();
        fetchComment();
    }, [id, fetchReplies, t]);

    return (
        <PageShell rightRail={<TrendingTopicsWidget />}>
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center gap-6">
                <button
                    type="button"
                    onClick={handleBack}
                    className="text-white hover:bg-white/10 p-2 -ml-2 rounded-full transition-colors"
                >
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
                    {t("page.comment")}
                </h2>
            </div>

            {isLoading ? (
                <div className="p-8 text-white/40">
                    {t("page.loadingComment")}
                </div>
            ) : error ? (
                <div className="p-8 text-red-400/60">{error}</div>
            ) : comment ? (
                <>
                    <CommentCard
                        comment={comment}
                        onDeleted={() => {
                            navigate(`/post/${comment.postId}`, {
                                replace: true,
                            });
                        }}
                    />
                    <CommentBox
                        postId={comment.postId}
                        parentId={id!}
                        onCommentCreated={(newReply) => {
                            addReply(newReply);
                        }}
                    />
                    {repliesLoading ? (
                        <div className="p-8 text-white/40">
                            {t("page.loadingReplies")}
                        </div>
                    ) : repliesError ? (
                        <div className="p-8 text-red-400/60">
                            {repliesError}
                        </div>
                    ) : (
                        <>
                            {replies.map((reply) => (
                                <CommentCard
                                    key={reply.id}
                                    comment={reply}
                                    onDeleted={removeReply}
                                />
                            ))}

                            {hasMoreReplies && !repliesLoadingMore && (
                                <div className="flex justify-center py-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={loadMoreReplies}
                                    >
                                        {t("common.loadMore")}
                                    </Button>
                                </div>
                            )}

                            {repliesLoadingMore && (
                                <div className="flex justify-center py-4">
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                </div>
                            )}
                        </>
                    )}
                </>
            ) : (
                <div className="p-8 text-white/40">
                    {t("page.commentNotFound")}
                </div>
            )}
        </PageShell>
    );
}
