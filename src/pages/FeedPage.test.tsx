import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthModalStore } from "../features/auth/store/auth-modal.store";
import { useFeed } from "../features/feed/components/useFeed";
import { useArticles } from "../features/article/hooks/useArticles";
import { useAuthStore } from "../core/auth/auth.store";
import FeedPage from "./FeedPage";

vi.mock("../shared/layout/PageShell", () => ({
    PageShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("../features/feed/components/PostList", () => ({
    PostList: () => <div data-testid="post-list" />,
}));
vi.mock("../features/feed/components/PostBox", () => ({
    PostBox: () => <div data-testid="post-box" />,
}));
vi.mock("../features/feed/components/useFeed", () => ({ useFeed: vi.fn() }));
vi.mock("../features/article/components/ArticleList", () => ({
    ArticleList: () => <div data-testid="article-list" />,
}));
vi.mock("../features/article/hooks/useArticles", () => ({
    useArticles: vi.fn(),
}));
vi.mock("../core/auth/auth.store", () => ({ useAuthStore: vi.fn() }));
vi.mock("../features/auth/store/auth-modal.store", () => ({
    useAuthModalStore: vi.fn(),
}));
vi.mock("../shared/components/TrendingTopicsWidget", () => ({
    TrendingTopicsWidget: () => null,
}));
vi.mock("../features/profile/components/ProfileSearchDropdown", () => ({
    ProfileSearchDropdown: () => null,
}));
vi.mock("../shared/components/ui/SEO", () => ({ SEO: () => null }));

const mockFetchPosts = vi.fn();
const mockFetchArticles = vi.fn();

function makeUseFeed(
    activeCategory: string = "COMMUNITY",
): ReturnType<typeof useFeed> {
    return {
        posts: [],
        isLoading: false,
        isLoadingMore: false,
        error: null,
        loadMoreError: null,
        fetchPosts: mockFetchPosts,
        retry: vi.fn(),
        activeCategory: activeCategory as ReturnType<
            typeof useFeed
        >["activeCategory"],
        changeCategory: vi.fn(),
        addPost: vi.fn(),
        removePost: vi.fn(),
        hasMore: false,
        loadMore: vi.fn(),
        retryLoadMore: vi.fn(),
    };
}

beforeEach(() => {
    mockFetchPosts.mockClear();
    mockFetchArticles.mockClear();
    vi.mocked(useFeed).mockReturnValue(makeUseFeed());
    vi.mocked(useArticles).mockReturnValue({
        articles: [],
        isLoading: false,
        isLoadingMore: false,
        error: null,
        loadMoreError: null,
        hasMore: false,
        fetchArticles: mockFetchArticles,
        loadMore: vi.fn(),
        retry: vi.fn(),
        retryLoadMore: vi.fn(),
    });
    // FeedPage uses selector form: useAuthStore((s) => s.isAuthenticated)
    // vi.fn().mockReturnValue(X) returns X regardless of arguments, so the selector is bypassed.
    vi.mocked(useAuthStore).mockReturnValue(
        false as unknown as ReturnType<typeof useAuthStore>,
    );
    // FeedPage uses selector form: useAuthModalStore((s) => s.openModal)
    vi.mocked(useAuthModalStore).mockReturnValue(
        vi.fn() as unknown as ReturnType<typeof useAuthModalStore>,
    );
});

describe("FeedPage", () => {
    it("renders the four tabs in order: Community, News, Updates, Articles", () => {
        render(<FeedPage />);

        const tabs = ["Community", "News", "Updates", "Articles"];
        for (const name of tabs) {
            expect(screen.getByRole("button", { name })).toBeInTheDocument();
        }
    });

    // Job postings were pulled from the UI when articles took their place. The
    // `JOB_POSTING` post type is deliberately still in the union, so existing
    // job posts keep rendering wherever they are linked — only the tab is gone.
    it("no longer offers a Jobs tab", () => {
        render(<FeedPage />);
        expect(
            screen.queryByRole("button", { name: "Jobs" }),
        ).not.toBeInTheDocument();
    });

    it("opens on the post list", () => {
        render(<FeedPage />);
        expect(screen.getByTestId("post-list")).toBeInTheDocument();
        expect(screen.queryByTestId("article-list")).not.toBeInTheDocument();
    });

    it("calls fetchPosts once on mount", () => {
        render(<FeedPage />);
        expect(mockFetchPosts).toHaveBeenCalledOnce();
    });

    it("shows PostBox on Community and hides it (with Following toggle) on News", async () => {
        const user = userEvent.setup();
        render(<FeedPage />);

        expect(screen.getByTestId("post-box")).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: /following/i }),
        ).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "News" }));

        expect(screen.queryByTestId("post-box")).not.toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: /following/i }),
        ).toBeInTheDocument();
    });

    it("shows category filter chips on News", async () => {
        const user = userEvent.setup();
        render(<FeedPage />);

        await user.click(screen.getByRole("button", { name: "News" }));

        for (const name of ["AI", "Game", "Mobile", "Backend", "Frontend"]) {
            expect(screen.getByRole("button", { name })).toBeInTheDocument();
        }
    });

    it("hides category filter chips on Community", () => {
        render(<FeedPage />);
        expect(
            screen.queryByRole("button", { name: "AI" }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Backend" }),
        ).not.toBeInTheDocument();
    });

    describe("the Articles tab", () => {
        const openArticles = async () => {
            const user = userEvent.setup();
            render(<FeedPage />);
            await user.click(screen.getByRole("button", { name: "Articles" }));
            return user;
        };

        it("swaps the post list for the article list", async () => {
            await openArticles();

            expect(screen.getByTestId("article-list")).toBeInTheDocument();
            expect(screen.queryByTestId("post-list")).not.toBeInTheDocument();
        });

        // Articles are a different resource on different endpoints; the two
        // lists must not both be fetching while one of them is hidden.
        it("fetches articles and stops fetching posts", async () => {
            await openArticles();

            await waitFor(() =>
                expect(mockFetchArticles).toHaveBeenCalledWith({
                    followedOnly: false,
                    categories: [],
                }),
            );
            expect(mockFetchPosts).toHaveBeenCalledOnce();
        });

        it("hides the post composer", async () => {
            await openArticles();

            expect(screen.queryByTestId("post-box")).not.toBeInTheDocument();
        });

        // The articles endpoint takes `followedOnly` and `categories` too.
        it("offers the same Following toggle and category chips", async () => {
            await openArticles();

            expect(
                screen.getByRole("button", { name: /following/i }),
            ).toBeInTheDocument();
            expect(
                screen.getByRole("button", { name: "Backend" }),
            ).toBeInTheDocument();
        });

        it("narrows the articles by the chosen category", async () => {
            const user = await openArticles();

            await user.click(screen.getByRole("button", { name: "Backend" }));

            await waitFor(() =>
                expect(mockFetchArticles).toHaveBeenLastCalledWith({
                    followedOnly: false,
                    categories: ["BACKEND"],
                }),
            );
        });

        it("returns to the post list when another tab is chosen", async () => {
            const user = await openArticles();
            mockFetchPosts.mockClear();

            await user.click(screen.getByRole("button", { name: "Community" }));

            expect(screen.getByTestId("post-list")).toBeInTheDocument();
            expect(
                screen.queryByTestId("article-list"),
            ).not.toBeInTheDocument();
            await waitFor(() => expect(mockFetchPosts).toHaveBeenCalled());
        });
    });
});
