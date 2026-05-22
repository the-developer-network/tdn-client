import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthModalStore } from "../features/auth/store/auth-modal.store";
import { useFeed } from "../features/feed/components/useFeed";
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
    vi.mocked(useFeed).mockReturnValue(makeUseFeed());
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
    it("renders all 4 category tab buttons", () => {
        render(<FeedPage />);
        expect(
            screen.getByRole("button", { name: "Community" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "News" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Updates" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Jobs" }),
        ).toBeInTheDocument();
    });

    it("renders the PostList stub", () => {
        render(<FeedPage />);
        expect(screen.getByTestId("post-list")).toBeInTheDocument();
    });

    it("shows PostBox for COMMUNITY and hides it (with Following toggle) for TECH_NEWS", () => {
        vi.mocked(useFeed).mockReturnValue(makeUseFeed("COMMUNITY"));
        const { rerender } = render(<FeedPage />);
        expect(screen.getByTestId("post-box")).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: /following/i }),
        ).not.toBeInTheDocument();

        vi.mocked(useFeed).mockReturnValue(makeUseFeed("TECH_NEWS"));
        rerender(<FeedPage />);
        expect(screen.queryByTestId("post-box")).not.toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: /following/i }),
        ).toBeInTheDocument();
    });

    it("calls fetchPosts once on mount", () => {
        render(<FeedPage />);
        expect(mockFetchPosts).toHaveBeenCalledOnce();
    });
});
