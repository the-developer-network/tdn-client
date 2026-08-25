import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Comment } from "../api/comment.types";
import { CommentList } from "./CommentList";

// Isolate CommentList from its child CommentCard.
vi.mock("./CommentCard", () => ({
    CommentCard: () => <article data-testid="comment-card" />,
}));

const mockComment: Comment = {
    id: "c1",
    content: "Test comment",
    mediaUrls: [],
    createdAt: new Date().toISOString(),
    likeCount: 0,
    replyCount: 0,
    isLiked: false,
    isBookmarked: false,
    author: { id: "u1", username: "alice", avatarUrl: "" },
    parentId: null,
    postId: "post-1",
    articleId: null,
};

describe("CommentList", () => {
    it("renders a spinner when isLoading is true", () => {
        const { container } = render(
            <CommentList comments={[]} isLoading error={null} />,
        );
        expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    });

    it("renders the error message and calls onRetry on Try Again click", () => {
        const onRetry = vi.fn();
        render(
            <CommentList
                comments={[]}
                isLoading={false}
                error="Load failed"
                onRetry={onRetry}
            />,
        );
        expect(screen.getByText("Load failed")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: /try again/i }));
        expect(onRetry).toHaveBeenCalledOnce();
    });

    it("renders the empty state text when comments is empty", () => {
        render(<CommentList comments={[]} isLoading={false} error={null} />);
        expect(screen.getByText(/no comments yet/i)).toBeInTheDocument();
    });

    it("renders one CommentCard per comment", () => {
        const comments = [mockComment, { ...mockComment, id: "c2" }];
        render(
            <CommentList comments={comments} isLoading={false} error={null} />,
        );
        expect(screen.getAllByTestId("comment-card")).toHaveLength(2);
    });
});
