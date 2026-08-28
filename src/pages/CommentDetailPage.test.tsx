import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { commentApi } from "../features/comment/api/comment.api";
import { useCommentReplies } from "../features/comment/hooks/useCommentReplies";
import type { Comment } from "../features/comment/api/comment.types";
import CommentDetailPage from "./CommentDetailPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual =
        await vi.importActual<typeof import("react-router-dom")>(
            "react-router-dom",
        );
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useParams: () => ({ id: "c-123" }),
    };
});

vi.mock("../shared/layout/PageShell", () => ({
    PageShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("../features/comment/components/CommentCard", () => ({
    CommentCard: () => <article data-testid="comment-card" />,
}));
vi.mock("../features/comment/components/CommentBox", () => ({
    CommentBox: () => null,
}));
vi.mock("../features/comment/api/comment.api", () => ({
    commentApi: { getCommentById: vi.fn() },
}));
vi.mock("../features/comment/hooks/useCommentReplies", () => ({
    useCommentReplies: vi.fn(),
}));
vi.mock("../shared/components/TrendingTopicsWidget", () => ({
    TrendingTopicsWidget: () => null,
}));

const mockComment: Comment = {
    id: "c-123",
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

beforeEach(() => {
    mockNavigate.mockClear();
    // The whole shape, not just the parts these tests read: the page pulls
    // `hasMore`/`loadMore` off this hook to render its "load more" button, and
    // a mock missing them hands the page an `undefined` click handler.
    vi.mocked(useCommentReplies).mockReturnValue({
        replies: [],
        isLoading: false,
        isLoadingMore: false,
        hasMore: false,
        error: null,
        fetchReplies: vi.fn(),
        loadMore: vi.fn(),
        addReply: vi.fn(),
        removeReply: vi.fn(),
    });
});

describe("CommentDetailPage", () => {
    it("renders loading text while the comment is loading", () => {
        vi.mocked(commentApi.getCommentById).mockReturnValue(
            new Promise(() => {}),
        );
        render(<CommentDetailPage />);
        expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("renders the error message when the API call rejects", async () => {
        vi.mocked(commentApi.getCommentById).mockRejectedValue(
            new Error("fail"),
        );
        render(<CommentDetailPage />);
        await waitFor(() =>
            expect(
                screen.getByText("Comment could not be loaded."),
            ).toBeInTheDocument(),
        );
    });

    it("renders the CommentCard stub once the comment has loaded", async () => {
        vi.mocked(commentApi.getCommentById).mockResolvedValue(mockComment);
        render(<CommentDetailPage />);
        await waitFor(() =>
            expect(screen.getByTestId("comment-card")).toBeInTheDocument(),
        );
    });
});
