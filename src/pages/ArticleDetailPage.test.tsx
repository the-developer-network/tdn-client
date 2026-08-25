import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual =
        await vi.importActual<typeof import("react-router-dom")>(
            "react-router-dom",
        );
    return {
        ...actual,
        useNavigate: () => navigate,
        useParams: () => ({ slug: "clean-architecture" }),
    };
});

vi.mock("../shared/layout/PageShell", () => ({
    PageShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("../shared/components/TrendingTopicsWidget", () => ({
    TrendingTopicsWidget: () => null,
}));
vi.mock("../shared/components/ui/SEO", () => ({ SEO: () => null }));
vi.mock("../features/comment/components/CommentList", () => ({
    CommentList: () => <div data-testid="comment-list" />,
}));
vi.mock("../features/comment/components/CommentBox", () => ({
    CommentBox: ({ target }: { target: { type: string; id: string } }) => (
        <div data-testid="comment-box">{`${target.type}:${target.id}`}</div>
    ),
}));
vi.mock("../features/article/hooks/useArticle", () => ({
    useArticle: vi.fn(),
}));
vi.mock("../features/article/hooks/useArticleActions", () => ({
    useArticleActions: vi.fn(),
}));
vi.mock("../features/comment/hooks/useComments", () => ({
    useComments: vi.fn(),
}));

import { useArticle } from "../features/article/hooks/useArticle";
import { useArticleActions } from "../features/article/hooks/useArticleActions";
import { useComments } from "../features/comment/hooks/useComments";
import ArticleDetailPage from "./ArticleDetailPage";
import type { Article } from "../features/article/api/article.types";

const article: Article = {
    id: "article-1",
    slug: "clean-architecture",
    title: "Clean Architecture",
    excerpt: "An excerpt.",
    body: "# Heading\n\nBody text.",
    coverImageUrl: null,
    coverImageAlt: null,
    readingTimeMinutes: 7,
    likeCount: 3,
    commentCount: 1,
    isLiked: false,
    isBookmarked: false,
    status: "PUBLISHED",
    publishedAt: "2026-08-01T10:00:00.000Z",
    createdAt: "2026-08-01T10:00:00.000Z",
    author: {
        id: "user-1",
        username: "testuser",
        fullName: "Test User",
        avatarUrl: "https://example.com/avatar.png",
    },
    tags: [{ name: "fastify" }],
    categories: ["BACKEND"],
};

const mockHandleLike = vi.fn();
const mockRetry = vi.fn();
const mockFetchComments = vi.fn();

const setArticleState = (
    state: Partial<ReturnType<typeof useArticle>> = {},
) => {
    vi.mocked(useArticle).mockReturnValue({
        article,
        isLoading: false,
        error: null,
        retry: mockRetry,
        ...state,
    });
};

beforeEach(() => {
    vi.clearAllMocks();
    setArticleState();
    vi.mocked(useArticleActions).mockReturnValue({
        isLiked: false,
        likeCount: 3,
        isLikeLoading: false,
        handleLike: mockHandleLike,
        isBookmarked: false,
        isBookmarkLoading: false,
        handleBookmark: vi.fn(),
        handleShare: vi.fn(),
    });
    vi.mocked(useComments).mockReturnValue({
        comments: [],
        isLoading: false,
        isLoadingMore: false,
        hasMore: false,
        error: null,
        fetchComments: mockFetchComments,
        retry: vi.fn(),
        loadMore: vi.fn(),
        addComment: vi.fn(),
        removeComment: vi.fn(),
    });
});

describe("ArticleDetailPage", () => {
    it("renders the title, metadata and markdown body", () => {
        render(<ArticleDetailPage />);

        expect(
            screen.getByRole("heading", {
                level: 1,
                name: "Clean Architecture",
            }),
        ).toBeInTheDocument();
        expect(screen.getByText("7 min read")).toBeInTheDocument();
        expect(
            screen.getByRole("heading", { level: 1, name: "Heading" }),
        ).toBeInTheDocument();
        expect(screen.getByText("Body text.")).toBeInTheDocument();
    });

    it("shows a spinner while the article loads", () => {
        setArticleState({ article: null, isLoading: true });
        const { container } = render(<ArticleDetailPage />);

        expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    });

    it("shows the error with a retry rather than a bare not-found", async () => {
        const user = userEvent.setup();
        setArticleState({
            article: null,
            isLoading: false,
            error: "Articles are unavailable.",
        });
        render(<ArticleDetailPage />);

        expect(
            screen.getByText("Articles are unavailable."),
        ).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Try Again" }));
        expect(mockRetry).toHaveBeenCalledOnce();
    });

    it("shows not-found when the article is simply absent", () => {
        setArticleState({ article: null, isLoading: false, error: null });
        render(<ArticleDetailPage />);

        expect(screen.getByText("Article not found.")).toBeInTheDocument();
    });

    // Reading is by slug, but every write route takes the uuid — the comment
    // box has to be handed the id, not the slug in the URL.
    it("scopes the comment box to the article's id", () => {
        render(<ArticleDetailPage />);

        expect(screen.getByTestId("comment-box")).toHaveTextContent(
            "article:article-1",
        );
        expect(useComments).toHaveBeenCalledWith({
            type: "article",
            id: "article-1",
        });
    });

    it("loads the comments once the article is on screen", async () => {
        render(<ArticleDetailPage />);

        await waitFor(() => expect(mockFetchComments).toHaveBeenCalled());
        expect(screen.getByTestId("comment-list")).toBeInTheDocument();
    });

    it("likes through the action hook", async () => {
        const user = userEvent.setup();
        render(<ArticleDetailPage />);

        await user.click(screen.getByRole("button", { name: "Like article" }));

        expect(mockHandleLike).toHaveBeenCalledOnce();
    });

    it("seeds the action hook with the article's own id and slug", () => {
        render(<ArticleDetailPage />);

        expect(useArticleActions).toHaveBeenCalledWith(
            "article-1",
            "clean-architecture",
            false,
            3,
            false,
            "Clean Architecture",
        );
    });

    it("goes back through history", async () => {
        const user = userEvent.setup();
        render(<ArticleDetailPage />);

        await user.click(screen.getByRole("button", { name: "Back" }));

        expect(navigate).toHaveBeenCalledWith(-1);
    });
});
