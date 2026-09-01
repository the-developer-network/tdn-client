import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import { useAuthModalStore } from "../features/auth/store/auth-modal.store";
import { useFeed } from "../features/feed/components/useFeed";
import { useArticles } from "../features/article/hooks/useArticles";
import { useAuthStore } from "../core/auth/auth.store";
import { useFeedSnapshotStore } from "../features/feed/store/feed-snapshot.store";
import type { Post } from "../features/feed/api/feed.types";
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
// jsdom has no layout, so it neither implements `scrollTo` nor moves
// `scrollY`. Both are driven by hand here — which is also what lets the
// restored offset be asserted rather than only observed in the browser.
const mockScrollTo = vi.fn();

function setScrollY(value: number) {
    Object.defineProperty(window, "scrollY", {
        value,
        configurable: true,
    });
}

function makePost(id = "post-1"): Post {
    return {
        isSensitive: false,
        mediaPending: false,
        id,
        content: "Hello",
        type: "COMMUNITY",
        mediaUrls: [],
        createdAt: new Date().toISOString(),
        likeCount: 0,
        commentCount: 0,
        isLiked: false,
        isBookmarked: false,
        quoteCount: 0,
        quotedPost: null,
        author: { id: "u1", username: "bob", avatarUrl: "" },
        tags: [],
    };
}

function makeUseFeed(posts: Post[] = []): ReturnType<typeof useFeed> {
    return {
        posts,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        loadMoreError: null,
        fetchPosts: mockFetchPosts,
        retry: vi.fn(),
        addPost: vi.fn(),
        removePost: vi.fn(),
        hasMore: false,
        loadMore: vi.fn(),
        retryLoadMore: vi.fn(),
        page: 1,
    };
}

/** Reports the query string back, so the tab can be asserted where it lives. */
function LocationProbe() {
    const location = useLocation();
    return <div data-testid="location">{location.search}</div>;
}

// The page reads the tab from the URL and writes it back, so every render
// needs a router — and `MemoryRouter` reports POP for its first entry, which
// is what makes the restore path reachable here at all.
function renderFeed(entry: string = "/") {
    return render(
        <MemoryRouter initialEntries={[entry]}>
            <FeedPage />
            <LocationProbe />
        </MemoryRouter>,
    );
}

beforeEach(() => {
    mockFetchPosts.mockClear();
    mockFetchArticles.mockClear();
    // A snapshot leaking between tests would silently suppress the fetch the
    // next test is asserting on.
    useFeedSnapshotStore.setState({ key: null, snapshot: null });
    mockScrollTo.mockClear();
    vi.stubGlobal("scrollTo", mockScrollTo);
    setScrollY(0);
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
        page: 1,
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
        renderFeed();

        const tabs = ["Community", "News", "Updates", "Articles"];
        for (const name of tabs) {
            expect(screen.getByRole("button", { name })).toBeInTheDocument();
        }
    });

    // Job postings were pulled from the UI when articles took their place. The
    // `JOB_POSTING` post type is deliberately still in the union, so existing
    // job posts keep rendering wherever they are linked — only the tab is gone.
    it("no longer offers a Jobs tab", () => {
        renderFeed();
        expect(
            screen.queryByRole("button", { name: "Jobs" }),
        ).not.toBeInTheDocument();
    });

    it("opens on the post list", () => {
        renderFeed();
        expect(screen.getByTestId("post-list")).toBeInTheDocument();
        expect(screen.queryByTestId("article-list")).not.toBeInTheDocument();
    });

    it("calls fetchPosts once on mount", () => {
        renderFeed();
        expect(mockFetchPosts).toHaveBeenCalledOnce();
    });

    it("shows PostBox on Community and hides it (with Following toggle) on News", async () => {
        const user = userEvent.setup();
        renderFeed();

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
        renderFeed();

        await user.click(screen.getByRole("button", { name: "News" }));

        for (const name of ["AI", "Game", "Mobile", "Backend", "Frontend"]) {
            expect(screen.getByRole("button", { name })).toBeInTheDocument();
        }
    });

    it("hides category filter chips on Community", () => {
        renderFeed();
        expect(
            screen.queryByRole("button", { name: "AI" }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Backend" }),
        ).not.toBeInTheDocument();
    });

    /**
     * Opening a post unmounts the feed, so anything the feed kept in component
     * state was gone by the time the reader pressed Back — they landed on
     * Community, page 1, at the top, whichever tab they had been reading.
     * The tab lives in the URL now, and the list itself in a snapshot keyed to
     * the history entry it was taken from.
     */
    describe("surviving a Back", () => {
        it("puts the open tab in the URL", async () => {
            const user = userEvent.setup();
            renderFeed();

            await user.click(screen.getByRole("button", { name: "News" }));

            expect(screen.getByTestId("location")).toHaveTextContent(
                "tab=news",
            );
        });

        it("opens the tab the URL names", () => {
            renderFeed("/?tab=news");

            expect(mockFetchPosts).toHaveBeenCalledWith("TECH_NEWS");
        });

        it("opens Community when the slug means nothing", () => {
            renderFeed("/?tab=nonsense");

            expect(mockFetchPosts).toHaveBeenCalledWith("COMMUNITY");
        });

        it("keeps the filters in the URL too", async () => {
            const user = userEvent.setup();
            renderFeed("/?tab=news");

            await user.click(screen.getByRole("button", { name: "Backend" }));

            expect(screen.getByTestId("location")).toHaveTextContent(
                "categories=BACKEND",
            );
        });

        it("reads the filters back out of the URL", () => {
            renderFeed("/?tab=articles&following=1&categories=AI,GAME");

            expect(mockFetchArticles).toHaveBeenCalledWith({
                followedOnly: true,
                categories: ["AI", "GAME"],
            });
        });

        // Three chip taps must not cost three presses of Back to leave the
        // feed. Filtering replaces the entry rather than pushing a new one.
        it("replaces the history entry rather than stacking one per tap", async () => {
            const user = userEvent.setup();
            renderFeed("/?tab=news");

            await user.click(screen.getByRole("button", { name: "Backend" }));
            await user.click(screen.getByRole("button", { name: "AI" }));

            expect(window.history.length).toBeLessThan(4);
        });

        it("restores the list it left instead of fetching a new one", () => {
            vi.mocked(useFeed).mockReturnValue(makeUseFeed([makePost()]));

            const { unmount } = renderFeed("/?tab=news");
            unmount();
            mockFetchPosts.mockClear();

            renderFeed("/?tab=news");

            expect(mockFetchPosts).not.toHaveBeenCalled();
            expect(vi.mocked(useFeed).mock.calls.at(-1)?.[2]).toMatchObject({
                type: "TECH_NEWS",
            });
        });

        it("returns to the offset the reader left from", () => {
            vi.mocked(useFeed).mockReturnValue(makeUseFeed([makePost()]));

            const { unmount } = renderFeed("/?tab=news");
            setScrollY(640);
            fireEvent.scroll(window);
            unmount();

            renderFeed("/?tab=news");

            expect(mockScrollTo).toHaveBeenCalledWith(0, 640);
        });

        // Leaving mid-request would otherwise store an empty list, and coming
        // back would restore that emptiness and never fetch again.
        it("does not save a feed that has not arrived yet", () => {
            const { unmount } = renderFeed("/?tab=news");
            unmount();

            expect(useFeedSnapshotStore.getState().snapshot).toBeNull();
        });

        // The snapshot describes one feed. Change what the feed is and it no
        // longer applies, restored or not.
        it("fetches again once the reader changes tab", async () => {
            vi.mocked(useFeed).mockReturnValue(makeUseFeed([makePost()]));
            const user = userEvent.setup();

            const { unmount } = renderFeed("/?tab=news");
            unmount();
            mockFetchPosts.mockClear();

            renderFeed("/?tab=news");
            expect(mockFetchPosts).not.toHaveBeenCalled();

            await user.click(screen.getByRole("button", { name: "Updates" }));

            expect(mockFetchPosts).toHaveBeenCalledWith("SYSTEM_UPDATE");
        });
    });

    describe("the Articles tab", () => {
        const openArticles = async () => {
            const user = userEvent.setup();
            renderFeed();
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
