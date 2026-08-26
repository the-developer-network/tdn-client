import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthModalStore } from "../features/auth/store/auth-modal.store";
import { useBookmarks } from "../features/feed/hooks/useBookmarks";
import { useAuthStore } from "../core/auth/auth.store";
import BookmarksPage from "./BookmarksPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual =
        await vi.importActual<typeof import("react-router-dom")>(
            "react-router-dom",
        );
    return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../shared/layout/PageShell", () => ({
    PageShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("../features/feed/components/PostList", () => ({
    PostList: () => <div data-testid="post-list" />,
}));
vi.mock("../features/comment/components/CommentList", () => ({
    CommentList: () => <div data-testid="comment-list" />,
}));
vi.mock("../features/article/components/ArticleList", () => ({
    ArticleList: () => <div data-testid="article-list" />,
}));
vi.mock("../features/feed/hooks/useBookmarks", () => ({
    useBookmarks: vi.fn(),
}));
vi.mock("../core/auth/auth.store", () => ({ useAuthStore: vi.fn() }));
vi.mock("../features/auth/store/auth-modal.store", () => ({
    useAuthModalStore: vi.fn(),
}));
vi.mock("../shared/components/TrendingTopicsWidget", () => ({
    TrendingTopicsWidget: () => null,
}));

function makeAuth(isAuthenticated: boolean) {
    return {
        isAuthenticated,
        user: isAuthenticated ? { username: "alice" } : null,
    } as unknown as ReturnType<typeof useAuthStore>;
}

function makeAuthModal() {
    return {
        openModal: vi.fn(),
        setStep: vi.fn(),
    } as unknown as ReturnType<typeof useAuthModalStore>;
}

beforeEach(() => {
    mockNavigate.mockClear();
    vi.mocked(useAuthStore).mockReturnValue(makeAuth(true));
    vi.mocked(useAuthModalStore).mockReturnValue(makeAuthModal());
    vi.mocked(useBookmarks).mockReturnValue({
        posts: [],
        comments: [],
        articles: [],
        isLoading: false,
        error: null,
        fetchBookmarks: vi.fn(),
        retry: vi.fn(),
        removePost: vi.fn(),
    } as unknown as ReturnType<typeof useBookmarks>);
});

describe("BookmarksPage", () => {
    it("renders nothing and redirects when unauthenticated", () => {
        vi.mocked(useAuthStore).mockReturnValue(makeAuth(false));
        const { container } = render(<BookmarksPage />);
        expect(container.firstChild).toBeNull();
        expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    });

    it("renders a spinner while bookmarks are loading", () => {
        vi.mocked(useBookmarks).mockReturnValue({
            posts: [],
            comments: [],
            articles: [],
            isLoading: true,
            error: null,
            fetchBookmarks: vi.fn(),
            retry: vi.fn(),
            removePost: vi.fn(),
        } as unknown as ReturnType<typeof useBookmarks>);
        const { container } = render(<BookmarksPage />);
        expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    });

    it("renders the empty state when there are no bookmarks", () => {
        render(<BookmarksPage />);
        expect(screen.getByText("Save posts for later")).toBeInTheDocument();
    });

    // The saved list gained a third collection: `GET /posts/bookmarks` now
    // answers with `articles` alongside posts and comments.
    it("shows the posts tab first", () => {
        vi.mocked(useBookmarks).mockReturnValue({
            posts: [{ id: "post-1" }],
            comments: [],
            articles: [{ id: "article-1" }],
            isLoading: false,
            error: null,
            fetchBookmarks: vi.fn(),
            retry: vi.fn(),
            removePost: vi.fn(),
        } as unknown as ReturnType<typeof useBookmarks>);

        render(<BookmarksPage />);

        expect(screen.getByTestId("post-list")).toBeInTheDocument();
        expect(screen.queryByTestId("article-list")).not.toBeInTheDocument();
    });

    // Only one list may be mounted at a time: PostList and ArticleList each
    // install an IntersectionObserver sentinel that calls the same loadMore.
    it("swaps the post list for the article list on the Articles tab", async () => {
        vi.mocked(useBookmarks).mockReturnValue({
            posts: [{ id: "post-1" }],
            comments: [],
            articles: [{ id: "article-1" }],
            isLoading: false,
            error: null,
            fetchBookmarks: vi.fn(),
            retry: vi.fn(),
            removePost: vi.fn(),
        } as unknown as ReturnType<typeof useBookmarks>);

        render(<BookmarksPage />);
        await userEvent.click(screen.getByRole("button", { name: "Articles" }));

        expect(screen.getByTestId("article-list")).toBeInTheDocument();
        expect(screen.queryByTestId("post-list")).not.toBeInTheDocument();
    });

    it("keeps the empty state away when only articles are saved", () => {
        vi.mocked(useBookmarks).mockReturnValue({
            posts: [],
            comments: [],
            articles: [{ id: "article-1" }],
            isLoading: false,
            error: null,
            fetchBookmarks: vi.fn(),
            retry: vi.fn(),
            removePost: vi.fn(),
        } as unknown as ReturnType<typeof useBookmarks>);

        render(<BookmarksPage />);

        expect(
            screen.queryByText("Save posts for later"),
        ).not.toBeInTheDocument();
    });
});
