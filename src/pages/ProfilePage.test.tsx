import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProfile } from "../features/profile/hooks/useProfile";
import { useUserPosts } from "../features/profile/hooks/useUserPosts";
import { useFollowAction } from "../features/profile/hooks/useFollowAction";
import { useArticles } from "../features/article/hooks/useArticles";
import { useAuthStore } from "../core/auth/auth.store";
import { useAuthModalStore } from "../features/auth/store/auth-modal.store";
import ProfilePage from "./ProfilePage";

vi.mock("react-router-dom", async () => {
    const actual =
        await vi.importActual<typeof import("react-router-dom")>(
            "react-router-dom",
        );
    return {
        ...actual,
        useNavigate: () => vi.fn(),
        useParams: () => ({ username: "alice" }),
    };
});

vi.mock("../shared/layout/PageShell", () => ({
    PageShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("../shared/components/TrendingTopicsWidget", () => ({
    TrendingTopicsWidget: () => null,
}));
vi.mock("../shared/components/ui/SEO", () => ({ SEO: () => null }));
vi.mock("../features/profile/components/FollowListModal", () => ({
    FollowListModal: () => null,
}));
vi.mock("../features/profile/components/EditProfileModal", () => ({
    EditProfileModal: () => null,
}));

// Mirrors the real PostList, which renders its own error block. Stubbing it
// out entirely would hide the duplicate this test exists to catch.
vi.mock("../features/feed/components/PostList", () => ({
    PostList: ({ error }: { error: string | null }) =>
        error ? (
            <div data-testid="post-list-error">{error}</div>
        ) : (
            <div data-testid="post-list" />
        ),
}));

vi.mock("../features/article/components/ArticleList", () => ({
    ArticleList: () => <div data-testid="article-list" />,
}));
vi.mock("../features/article/hooks/useArticles", () => ({
    useArticles: vi.fn(),
}));

vi.mock("../features/profile/hooks/useProfile", () => ({
    useProfile: vi.fn(),
}));
vi.mock("../features/profile/hooks/useUserPosts", () => ({
    useUserPosts: vi.fn(),
}));
vi.mock("../features/profile/hooks/useFollowAction", () => ({
    useFollowAction: vi.fn(),
}));
vi.mock("../core/auth/auth.store", () => ({ useAuthStore: vi.fn() }));
vi.mock("../features/auth/store/auth-modal.store", () => ({
    useAuthModalStore: vi.fn(),
}));

const NETWORK_ERROR =
    "Unable to connect. Please check your internet connection.";

const retryProfile = vi.fn();
const retryPosts = vi.fn();
const fetchArticles = vi.fn();

function mockProfile(overrides: Partial<ReturnType<typeof useProfile>> = {}) {
    vi.mocked(useProfile).mockReturnValue({
        profile: null,
        isLoading: false,
        error: null,
        retry: retryProfile,
        ...overrides,
    } as ReturnType<typeof useProfile>);
}

function mockPosts(overrides: Partial<ReturnType<typeof useUserPosts>> = {}) {
    vi.mocked(useUserPosts).mockReturnValue({
        posts: [],
        isLoading: false,
        isLoadingMore: false,
        error: null,
        hasMore: false,
        loadMore: vi.fn(),
        retry: retryPosts,
        removePost: vi.fn(),
        ...overrides,
    } as ReturnType<typeof useUserPosts>);
}

beforeEach(() => {
    retryProfile.mockClear();
    retryPosts.mockClear();

    // Both stores are read through selectors, so the mock has to apply them.
    vi.mocked(useAuthStore).mockImplementation((selector?: unknown) => {
        const state = { updateUser: vi.fn(), isAuthenticated: true };
        return typeof selector === "function"
            ? (selector as (s: typeof state) => unknown)(state)
            : state;
    });
    vi.mocked(useAuthModalStore).mockImplementation((selector?: unknown) => {
        const state = { openModal: vi.fn(), setStep: vi.fn() };
        return typeof selector === "function"
            ? (selector as (s: typeof state) => unknown)(state)
            : state;
    });
    vi.mocked(useFollowAction).mockReturnValue({
        isFollowing: false,
        followersCount: 0,
        isLoading: false,
        handleFollow: vi.fn(),
    } as unknown as ReturnType<typeof useFollowAction>);

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
    });

    fetchArticles.mockClear();
    mockProfile();
    mockPosts();
});

describe("ProfilePage tabs", () => {
    it("opens on Posts, with the articles list not mounted", () => {
        render(<ProfilePage />);

        expect(screen.getByTestId("post-list")).toBeInTheDocument();
        expect(screen.queryByTestId("article-list")).not.toBeInTheDocument();
    });

    // Most visits never leave Posts, and the list endpoint is rate limited
    // like every other public read — so nothing is requested until asked for.
    it("does not request articles until the tab is opened", async () => {
        const user = userEvent.setup();
        render(<ProfilePage />);

        expect(fetchArticles).not.toHaveBeenCalled();

        await user.click(screen.getByRole("button", { name: "Articles" }));

        expect(fetchArticles).toHaveBeenCalledWith({
            authorUsername: "alice",
        });
    });

    it("swaps the post list for the article list", async () => {
        const user = userEvent.setup();
        render(<ProfilePage />);

        await user.click(screen.getByRole("button", { name: "Articles" }));

        expect(screen.getByTestId("article-list")).toBeInTheDocument();
        expect(screen.queryByTestId("post-list")).not.toBeInTheDocument();
    });

    it("goes back to the posts tab", async () => {
        const user = userEvent.setup();
        render(<ProfilePage />);

        await user.click(screen.getByRole("button", { name: "Articles" }));
        await user.click(screen.getByRole("button", { name: "Posts" }));

        expect(screen.getByTestId("post-list")).toBeInTheDocument();
        expect(screen.queryByTestId("article-list")).not.toBeInTheDocument();
    });

    it("hides both tabs while the profile itself is failing", () => {
        mockProfile({ error: NETWORK_ERROR });

        render(<ProfilePage />);

        expect(
            screen.queryByRole("button", { name: "Articles" }),
        ).not.toBeInTheDocument();
    });
});

describe("ProfilePage error states", () => {
    it("renders the message once when the profile and its posts both fail", () => {
        mockProfile({ error: NETWORK_ERROR });
        mockPosts({ error: NETWORK_ERROR });

        render(<ProfilePage />);

        expect(screen.getAllByText(NETWORK_ERROR)).toHaveLength(1);
    });

    it("hides the posts list while the profile is failing", () => {
        mockProfile({ error: NETWORK_ERROR });
        mockPosts({ error: NETWORK_ERROR });

        render(<ProfilePage />);

        expect(screen.queryByTestId("post-list-error")).not.toBeInTheDocument();
        expect(screen.queryByTestId("post-list")).not.toBeInTheDocument();
    });

    it("retries the profile and the posts from the single retry button", async () => {
        const user = userEvent.setup();
        mockProfile({ error: NETWORK_ERROR });
        mockPosts({ error: NETWORK_ERROR });

        render(<ProfilePage />);
        await user.click(screen.getByRole("button", { name: /try again/i }));

        expect(retryProfile).toHaveBeenCalledTimes(1);
        expect(retryPosts).toHaveBeenCalledTimes(1);
    });

    it("leaves the posts list to report its own error when the profile loaded", () => {
        mockProfile({
            profile: { username: "alice" } as never,
        });
        mockPosts({ error: NETWORK_ERROR });

        render(<ProfilePage />);

        expect(screen.getByTestId("post-list-error")).toHaveTextContent(
            NETWORK_ERROR,
        );
        expect(screen.getAllByText(NETWORK_ERROR)).toHaveLength(1);
    });

    it("does not render an inline error for an expired session", () => {
        mockProfile({ error: "Session expired, please sign in again" });

        render(<ProfilePage />);

        expect(screen.queryByText(/session expired/i)).not.toBeInTheDocument();
    });
});
