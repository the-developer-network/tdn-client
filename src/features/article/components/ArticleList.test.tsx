import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ArticleList } from "./ArticleList";
import type { ArticleSummary } from "../api/article.types";

vi.mock("./ArticleCard", () => ({
    ArticleCard: ({ title }: { title: string }) => (
        <div data-testid="article-card">{title}</div>
    ),
}));

const makeArticle = (id: string): ArticleSummary => ({
    isSensitive: false,
    id,
    slug: `slug-${id}`,
    title: `Article ${id}`,
    excerpt: "",
    coverImageUrl: null,
    coverImageAlt: null,
    readingTimeMinutes: 1,
    likeCount: 0,
    commentCount: 0,
    isLiked: false,
    isBookmarked: false,
    status: "PUBLISHED",
    publishedAt: null,
    createdAt: new Date().toISOString(),
    author: { id: "u", username: "u", avatarUrl: "" },
    tags: [],
    categories: [],
});

const baseProps = {
    articles: [] as ArticleSummary[],
    isLoading: false,
    isLoadingMore: false,
    hasMore: false,
    error: null as string | null,
    onLoadMore: vi.fn(),
};

/**
 * Typed against the component, not against `baseProps`. `baseProps` only
 * carries the required props, so a `Partial<typeof baseProps>` cannot express
 * `onRetry`, `loadMoreError` or `onRetryLoadMore` — the optional ones three of
 * these tests are entirely about.
 */
const renderList = (props: Partial<ComponentProps<typeof ArticleList>> = {}) =>
    render(
        <MemoryRouter>
            <ArticleList {...baseProps} {...props} />
        </MemoryRouter>,
    );

beforeEach(() => {
    vi.clearAllMocks();
    // jsdom has no IntersectionObserver; the sentinel effect needs one to exist.
    vi.stubGlobal(
        "IntersectionObserver",
        class {
            observe() {}
            disconnect() {}
        },
    );
});

describe("ArticleList", () => {
    it("shows a spinner while the first page is loading", () => {
        const { container } = renderList({ isLoading: true });

        expect(container.querySelector(".animate-spin")).toBeInTheDocument();
        expect(screen.queryByTestId("article-card")).not.toBeInTheDocument();
    });

    it("shows the error with a retry instead of an empty list", async () => {
        const onRetry = vi.fn();
        const user = userEvent.setup();
        renderList({ error: "Articles could not be loaded.", onRetry });

        expect(
            screen.getByText("Articles could not be loaded."),
        ).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Try Again" }));
        expect(onRetry).toHaveBeenCalledOnce();
    });

    it("shows the empty state when there is nothing to list", () => {
        renderList();

        expect(screen.getByText("No articles yet")).toBeInTheDocument();
    });

    it("renders one card per article", () => {
        renderList({ articles: [makeArticle("a"), makeArticle("b")] });

        expect(screen.getAllByTestId("article-card")).toHaveLength(2);
    });

    // A failed second page must not take the first one off the screen.
    it("keeps the list and offers a separate retry when load-more fails", async () => {
        const onRetryLoadMore = vi.fn();
        const user = userEvent.setup();
        renderList({
            articles: [makeArticle("a")],
            loadMoreError: "Failed to load more articles.",
            onRetryLoadMore,
        });

        expect(screen.getByTestId("article-card")).toBeInTheDocument();
        expect(
            screen.getByText("Failed to load more articles."),
        ).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Try Again" }));
        expect(onRetryLoadMore).toHaveBeenCalledOnce();
    });

    it("says there is nothing more once the last page is in", () => {
        renderList({ articles: [makeArticle("a")], hasMore: false });

        expect(screen.getByText("No more articles")).toBeInTheDocument();
    });

    it("does not announce the end while another page is still expected", () => {
        renderList({ articles: [makeArticle("a")], hasMore: true });

        expect(screen.queryByText("No more articles")).not.toBeInTheDocument();
    });
});
