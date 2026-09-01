import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { feedApi } from "../features/feed/api/feed.api";
import { useComments } from "../features/comment/hooks/useComments";
import type { Post } from "../features/feed/api/feed.types";
import PostDetailPage from "./PostDetailPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual =
        await vi.importActual<typeof import("react-router-dom")>(
            "react-router-dom",
        );
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useParams: () => ({ id: "post-123" }),
    };
});

vi.mock("../shared/layout/PageShell", () => ({
    PageShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("../features/feed/components/PostCard", () => ({
    PostCard: () => <article data-testid="post-card" />,
}));
vi.mock("../features/comment/components/CommentList", () => ({
    CommentList: () => <div data-testid="comment-list" />,
}));
vi.mock("../features/comment/components/CommentBox", () => ({
    CommentBox: () => null,
}));
vi.mock("../features/feed/api/feed.api", () => ({
    feedApi: { getPostById: vi.fn() },
}));
vi.mock("../features/comment/hooks/useComments", () => ({
    useComments: vi.fn(),
}));
vi.mock("../shared/components/ui/SEO", () => ({ SEO: () => null }));
vi.mock("../shared/components/TrendingTopicsWidget", () => ({
    TrendingTopicsWidget: () => null,
}));

const mockPost: Post = {
    isSensitive: false,
    mediaPending: false,
    id: "post-123",
    content: "Hello from test",
    type: "COMMUNITY",
    mediaUrls: [],
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0,
    isLiked: false,
    isBookmarked: false,
    quoteCount: 0,
    quotedPost: null,
    author: { id: "u1", username: "alice", fullName: "Alice", avatarUrl: "" },
    tags: [],
};

beforeEach(() => {
    mockNavigate.mockClear();
    vi.mocked(useComments).mockReturnValue({
        comments: [],
        isLoading: false,
        error: null,
        fetchComments: vi.fn(),
        retry: vi.fn(),
        addComment: vi.fn(),
        removeComment: vi.fn(),
    } as unknown as ReturnType<typeof useComments>);
});

describe("PostDetailPage", () => {
    it("renders a spinner while the post is loading", () => {
        vi.mocked(feedApi.getPostById).mockReturnValue(new Promise(() => {}));
        const { container } = render(<PostDetailPage />);
        expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    });

    it("renders the PostCard stub once the post has loaded", async () => {
        vi.mocked(feedApi.getPostById).mockResolvedValue(mockPost);
        render(<PostDetailPage />);
        await waitFor(() =>
            expect(screen.getByTestId("post-card")).toBeInTheDocument(),
        );
    });

    it("renders 'Post not found.' when the API call rejects", async () => {
        vi.mocked(feedApi.getPostById).mockRejectedValue(
            new Error("not found"),
        );
        render(<PostDetailPage />);
        await waitFor(() =>
            expect(screen.getByText("Post not found.")).toBeInTheDocument(),
        );
    });
});
