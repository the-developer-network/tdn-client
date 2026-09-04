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

// The mock records the layout props so the page's own layout choices — the
// reading width and keeping the trending rail — are asserted here rather than
// only being visible in the browser.
const pageShellProps = vi.fn();
vi.mock("../shared/layout/PageShell", () => ({
    PageShell: ({
        children,
        ...rest
    }: {
        children: React.ReactNode;
        width?: string;
        rightRail?: React.ReactNode;
    }) => {
        pageShellProps(rest);
        return (
            <>
                {children}
                {rest.rightRail}
            </>
        );
    },
}));
vi.mock("../shared/components/TrendingTopicsWidget", () => ({
    TrendingTopicsWidget: () => <div data-testid="trending" />,
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
    mentions: [],
    isSensitive: false,
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

    // Most articles have no cover — the API leaves `coverImageUrl` null and
    // there is no auto-generated stand-in, exactly as Medium behaves. The page
    // must read as deliberate rather than as a picture that failed to load.
    it("renders a cover when there is one", () => {
        setArticleState({
            article: {
                ...article,
                coverImageUrl: "https://example.com/cover.png",
                coverImageAlt: "A wide cover",
            },
        });
        const { container } = render(<ArticleDetailPage />);

        expect(container.querySelector("figure img")).toHaveAttribute(
            "src",
            "https://example.com/cover.png",
        );
        expect(screen.getByText("A wide cover")).toBeInTheDocument();
    });

    // The class is the behaviour here: without a height bound a portrait
    // cover renders taller than the viewport and the title lands below the
    // fold, which is exactly the regression this guards.
    it("bounds the cover's height instead of letting it run at its natural ratio", () => {
        setArticleState({
            article: {
                ...article,
                coverImageUrl: "https://example.com/cover.png",
            },
        });
        const { container } = render(<ArticleDetailPage />);

        const cover = container.querySelector("figure img")!;
        expect(cover.className).toMatch(/max-h-/);
        expect(cover.className).toContain("object-cover");
    });

    it("starts at the title and reserves no space when there is no cover", () => {
        const { container } = render(<ArticleDetailPage />);

        expect(container.querySelector("figure")).toBeNull();
        expect(container.querySelector("img[src='']")).toBeNull();
        expect(
            screen.getByRole("heading", {
                level: 1,
                name: "Clean Architecture",
            }),
        ).toBeInTheDocument();
    });

    it("shows the excerpt as a subtitle under the title", () => {
        render(<ArticleDetailPage />);

        expect(screen.getByText("An excerpt.")).toBeInTheDocument();
    });

    it("reads in the wide column and keeps the trending rail", () => {
        render(<ArticleDetailPage />);

        expect(pageShellProps).toHaveBeenCalledWith(
            expect.objectContaining({ width: "reading" }),
        );
        expect(screen.getByTestId("trending")).toBeInTheDocument();
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
