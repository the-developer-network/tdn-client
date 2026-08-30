import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Post } from "../api/feed.types";
import { PostList } from "./PostList";

// Isolate PostList from its children — we only test PostList's own logic here.
vi.mock("./PostCard", () => ({
    PostCard: () => <article data-testid="post-card" />,
}));
vi.mock("./AdPlaceholderCard", () => ({
    AdPlaceholderCard: () => <div data-testid="ad-card" />,
}));

// jsdom does not implement IntersectionObserver; stub it globally.
beforeAll(() => {
    vi.stubGlobal(
        "IntersectionObserver",
        class {
            observe() {}
            unobserve() {}
            disconnect() {}
        },
    );
});

const mockPost: Post = {
    id: "post-1",
    content: "Hello world",
    type: "COMMUNITY",
    mediaUrls: [],
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0,
    isLiked: false,
    isBookmarked: false,
    quoteCount: 0,
    quotedPost: null,
    author: {
        id: "u1",
        username: "testuser",
        fullName: "Test User",
        avatarUrl: "",
    },
    tags: [],
};

const defaultProps = {
    posts: [] as Post[],
    isLoading: false,
    isLoadingMore: false,
    hasMore: false,
    error: null,
    onLoadMore: vi.fn(),
};

describe("PostList", () => {
    it("renders a spinner when isLoading is true", () => {
        const { container } = render(<PostList {...defaultProps} isLoading />);
        expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    });

    it("renders the error message and calls onRetry on Try Again click", () => {
        const onRetry = vi.fn();
        render(
            <PostList
                {...defaultProps}
                error="Failed to load"
                onRetry={onRetry}
            />,
        );
        expect(screen.getByText("Failed to load")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: /try again/i }));
        expect(onRetry).toHaveBeenCalledOnce();
    });

    it("renders the empty state text when posts is empty", () => {
        render(<PostList {...defaultProps} />);
        expect(screen.getByText("Category Empty")).toBeInTheDocument();
    });

    it("renders one PostCard per post", () => {
        const posts = [mockPost, { ...mockPost, id: "post-2" }];
        render(<PostList {...defaultProps} posts={posts} />);
        expect(screen.getAllByTestId("post-card")).toHaveLength(2);
    });

    it("renders the load-more spinner when isLoadingMore and 'No more posts' when !hasMore", () => {
        const { container, rerender } = render(
            <PostList {...defaultProps} posts={[mockPost]} isLoadingMore />,
        );
        expect(container.querySelector(".animate-spin")).toBeInTheDocument();

        rerender(
            <PostList
                {...defaultProps}
                posts={[mockPost]}
                isLoadingMore={false}
                hasMore={false}
            />,
        );
        expect(screen.getByText("No more posts")).toBeInTheDocument();
    });
});
