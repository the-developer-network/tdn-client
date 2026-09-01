import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation, useNavigationType } from "react-router-dom";

// `useI18n` reaches `useLanguageStore`, which is a Zustand `persist` store and
// captures its storage at module-evaluation time. jsdom 29's `Storage.clear()`
// is broken, so the Map-backed stub has to exist before any import runs.
vi.hoisted(() => {
    const _map = new Map<string, string>();
    vi.stubGlobal("localStorage", {
        getItem: (key: string) => _map.get(key) ?? null,
        setItem: (key: string, value: string) => {
            _map.set(key, String(value));
        },
        removeItem: (key: string) => {
            _map.delete(key);
        },
        clear: () => {
            _map.clear();
        },
        get length() {
            return _map.size;
        },
        key: (i: number) => [..._map.keys()][i] ?? null,
    });
});

import { useFeed } from "../features/feed/components/useFeed";
import { useArticles } from "../features/article/hooks/useArticles";
import { useTrends } from "../features/trends/hooks/useTrends";
import { useTagSearch } from "../features/trends/hooks/useTagSearch";
import ExplorePage from "./ExplorePage";

vi.mock("../shared/layout/PageShell", () => ({
    PageShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("../shared/components/TrendingTopicsWidget", () => ({
    TrendingTopicsWidget: () => null,
}));

// Both lists are stubbed down to a marker: which one is mounted is the whole
// question here, and their own rendering is covered by their own specs.
vi.mock("../features/feed/components/PostList", () => ({
    PostList: () => <div data-testid="post-list" />,
}));
vi.mock("../features/article/components/ArticleList", () => ({
    ArticleList: () => <div data-testid="article-list" />,
}));

vi.mock("../features/feed/components/useFeed", () => ({ useFeed: vi.fn() }));
vi.mock("../features/article/hooks/useArticles", () => ({
    useArticles: vi.fn(),
}));
vi.mock("../features/trends/hooks/useTrends", () => ({ useTrends: vi.fn() }));
vi.mock("../features/trends/hooks/useTagSearch", () => ({
    useTagSearch: vi.fn(),
}));

const fetchPosts = vi.fn();
const fetchArticles = vi.fn();

/**
 * Reports the query string and how the last navigation happened, so both the
 * tab and the fact that switching it *replaces* can be asserted where they
 * actually live.
 */
function LocationProbe() {
    const location = useLocation();
    const navigationType = useNavigationType();
    return (
        <>
            <div data-testid="location">{location.search}</div>
            <div data-testid="navigation-type">{navigationType}</div>
        </>
    );
}

function renderExplore(entry: string) {
    return render(
        <MemoryRouter initialEntries={[entry]}>
            <ExplorePage />
            <LocationProbe />
        </MemoryRouter>,
    );
}

beforeEach(() => {
    fetchPosts.mockClear();
    fetchArticles.mockClear();

    vi.mocked(useFeed).mockReturnValue({
        posts: [],
        isLoading: false,
        isLoadingMore: false,
        error: null,
        loadMoreError: null,
        hasMore: false,
        fetchPosts,
        loadMore: vi.fn(),
        addPost: vi.fn(),
        replacePost: vi.fn(),
        removePost: vi.fn(),
        retry: vi.fn(),
        retryLoadMore: vi.fn(),
        page: 1,
    });
    vi.mocked(useArticles).mockReturnValue({
        articles: [],
        isLoading: false,
        isLoadingMore: false,
        error: null,
        loadMoreError: null,
        hasMore: false,
        fetchArticles,
        loadMore: vi.fn(),
        retry: vi.fn(),
        retryLoadMore: vi.fn(),
        page: 1,
    });
    vi.mocked(useTrends).mockReturnValue({
        trends: [],
        isLoading: false,
    } as unknown as ReturnType<typeof useTrends>);
    vi.mocked(useTagSearch).mockReturnValue({
        query: "",
        setQuery: vi.fn(),
        results: [],
        isLoading: false,
        clear: vi.fn(),
    } as unknown as ReturnType<typeof useTagSearch>);
});

describe("ExplorePage tag view", () => {
    it("opens on Posts and asks the API for that tag", () => {
        renderExplore("/explore?tag=nodejs");

        expect(fetchPosts).toHaveBeenCalledWith({ tag: "nodejs" });
        expect(screen.getByTestId("post-list")).toBeInTheDocument();
        expect(screen.queryByTestId("article-list")).not.toBeInTheDocument();
        // Deferred: most visits never leave Posts, and both endpoints are
        // rate limited alongside every other read.
        expect(fetchArticles).not.toHaveBeenCalled();
    });

    it("shows the tag's articles when the Articles tab is opened", async () => {
        const user = userEvent.setup();
        renderExplore("/explore?tag=nodejs");
        fetchPosts.mockClear();

        await user.click(screen.getByRole("button", { name: "Articles" }));

        expect(fetchArticles).toHaveBeenCalledWith({ tag: "nodejs" });
        expect(screen.getByTestId("article-list")).toBeInTheDocument();
        expect(screen.queryByTestId("post-list")).not.toBeInTheDocument();
        // The post effect stands down rather than refetching behind the
        // articles that replaced it.
        expect(fetchPosts).not.toHaveBeenCalled();
    });

    it("puts the open tab in the URL", async () => {
        const user = userEvent.setup();
        renderExplore("/explore?tag=nodejs");

        await user.click(screen.getByRole("button", { name: "Articles" }));

        expect(screen.getByTestId("location")).toHaveTextContent(
            "tab=articles",
        );
        expect(screen.getByTestId("location")).toHaveTextContent("tag=nodejs");
    });

    it("opens the tab the URL names", () => {
        renderExplore("/explore?tag=nodejs&tab=articles");

        expect(fetchArticles).toHaveBeenCalledWith({ tag: "nodejs" });
        expect(fetchPosts).not.toHaveBeenCalled();
        expect(screen.getByTestId("article-list")).toBeInTheDocument();
    });

    it("opens Posts when the slug means nothing", () => {
        renderExplore("/explore?tag=nodejs&tab=nonsense");

        expect(fetchPosts).toHaveBeenCalledWith({ tag: "nodejs" });
        expect(screen.getByTestId("post-list")).toBeInTheDocument();
    });

    // Back here is for leaving the tag, not for walking back through which of
    // its two lists was looked at last.
    it("replaces the history entry rather than pushing one per tab", async () => {
        const user = userEvent.setup();
        renderExplore("/explore?tag=nodejs");

        await user.click(screen.getByRole("button", { name: "Articles" }));

        expect(screen.getByTestId("navigation-type")).toHaveTextContent(
            "REPLACE",
        );
    });

    it("leaves the default tab out of the URL when it comes back", async () => {
        const user = userEvent.setup();
        renderExplore("/explore?tag=nodejs&tab=articles");

        await user.click(screen.getByRole("button", { name: "Posts" }));

        expect(screen.getByTestId("location")).not.toHaveTextContent("tab=");
        expect(screen.getByTestId("location")).toHaveTextContent("tag=nodejs");
    });

    it("says which of the two the subtitle is counting", async () => {
        const user = userEvent.setup();
        renderExplore("/explore?tag=nodejs");

        expect(
            screen.getByText("Posts tagged with #nodejs"),
        ).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Articles" }));

        expect(
            screen.getByText("Articles tagged with #nodejs"),
        ).toBeInTheDocument();
    });

    it("offers no tab strip on the trending view, and fetches nothing", () => {
        renderExplore("/explore");

        expect(
            screen.queryByRole("button", { name: "Articles" }),
        ).not.toBeInTheDocument();
        expect(fetchPosts).not.toHaveBeenCalled();
        expect(fetchArticles).not.toHaveBeenCalled();
    });
});
