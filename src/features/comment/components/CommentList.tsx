import type { Comment } from "../api/comment.types";
import { CommentCard } from "./CommentCard";
import { Button } from "../../../shared/components/ui/Button";

interface CommentListProps {
    comments: Comment[];
    isLoading: boolean;
    error: string | null;
    onCommentDeleted?: (commentId: string) => void;
    onRetry?: () => void;
}

export function CommentList({
    comments,
    isLoading,
    error,
    onCommentDeleted,
    onRetry,
}: CommentListProps) {
    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center flex flex-col items-center gap-4">
                <p className="text-red-400/60 text-sm">{error}</p>
                {onRetry && (
                    <Button variant="outline" size="sm" onClick={onRetry}>
                        Try Again
                    </Button>
                )}
            </div>
        );
    }

    if (comments.length === 0) {
        return (
            <div className="p-8 text-center text-white/30 text-sm">
                No comments yet. Be the first!
            </div>
        );
    }

    return (
        <div>
            {comments.map((comment) => (
                <CommentCard
                    key={comment.id}
                    comment={comment}
                    onDeleted={onCommentDeleted}
                />
            ))}
        </div>
    );
}
