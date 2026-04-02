import type { Comment } from "../api/comment.types";
import { CommentCard } from "./CommentCard";

interface CommentListProps {
    comments: Comment[];
    isLoading: boolean;
    error: string | null;
}

export function CommentList({ comments, isLoading, error }: CommentListProps) {
    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center text-red-400/60 text-sm">
                {error}
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
                <CommentCard key={comment.id} comment={comment} />
            ))}
        </div>
    );
}
