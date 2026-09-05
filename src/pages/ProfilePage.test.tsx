import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProfile } from "../features/profile/hooks/useProfile";
import { useUserPosts } from "../features/profile/hooks/useUserPosts";
import { useFollowAction } from "../features/profile/hooks/useFollowAction";
import { useOpenConversation } from "../features/messages/hooks/useOpenConversation";
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
vi.mock("../features/messages/hooks/useOpenConversation", () => ({
    useOpenConversation: vi.fn(),
}));
vi.mock("../core/auth/auth.store", () => ({ useAuthStore: vi.fn() }));
vi.mock("../features/auth/store/auth-modal.store", () => ({
    useAuthModalStore: vi.fn(),
}));

const NETWORK_ERROR =
    "Unable to connect. Please check your internet connection.";

const openConversation = vi.fn();
const handleFollow = vi.fn();
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
    openConversation.mockClear();
    handleFollow.mockClear();
    vi.mocked(useOpenConversation).mockReturnValue({
        open: openConversation,
        isOpening: false,
    });
    vi.mocked(useFollowAction).mockReturnValue({
        isFollowing: false,
        followersCount: 0,
        isLoading: false,
        handleFollow,
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
        page: 1,
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

/**
 * The regression from #158, locked at the call site.
 *
 * `GET /profiles/:username` sends `id` and no `userId`. Reading the field the
 * API does not send made the value `undefined`, `JSON.stringify` dropped the
 * key, and the request went out as `{}` — so the server could only report a
 * missing `recipientId`, which reads as a malformed body rather than as a
 * profile with no id.
 *
 * These fixtures carry `id` alone on purpose. A fixture that also sets
 * `userId` passes either way and proves nothing.
 */
describe("ProfilePage — the id every write carries", () => {
    const someoneElse = {
        id: "user-2",
        username: "bob",
        fullName: "Bob Builder",
        isMe: false,
        isFollowing: false,
        followersCount: 0,
    };

    it("opens the conversation with the id the API actually sent", async () => {
        mockProfile({ profile: someoneElse as never });

        render(<ProfilePage />);
        await userEvent.click(screen.getByRole("button", { name: "Message" }));

        expect(openConversation).toHaveBeenCalledWith("user-2");
    });

    /*
     * Both buttons, because they share one derived id now. Guarding only the
     * message button left Follow live on an empty id, where it would post
     * `{ targetId: "" }` — an empty string is not dropped from a body the way
     * `undefined` is, so the request goes out, fails, and rolls back with no
     * toast at all.
     */
    it("offers neither write when the profile carries no id", () => {
        mockProfile({
            profile: { ...someoneElse, id: undefined } as never,
        });

        render(<ProfilePage />);

        expect(screen.getByRole("button", { name: "Message" })).toBeDisabled();
        // A string `name` matches the whole accessible name, which is what is
        // wanted here: `/follow/i` would also match the followers and
        // following count buttons, the same trap `onboarding.spec` documents.
        expect(screen.getByRole("button", { name: "Follow" })).toBeDisabled();
    });

    it("still uses the legacy userId if that is all a response carries", async () => {
        mockProfile({
            profile: {
                ...someoneElse,
                id: undefined,
                userId: "legacy-2",
            } as never,
        });

        render(<ProfilePage />);
        await userEvent.click(screen.getByRole("button", { name: "Message" }));

        expect(openConversation).toHaveBeenCalledWith("legacy-2");
    });
});

/*
 * The server keeps serving a blocked account's profile rather than answering
 * 404, so that a blocked reader can be told what happened instead of assuming
 * the app is broken. The page has to say the two directions apart: one offers
 * the way out, the other is a wall.
 */
describe("ProfilePage blocking", () => {
    const bob = {
        id: "user-2",
        username: "bob",
        fullName: "Bob Builder",
        isMe: false,
        isFollowing: false,
        followersCount: 0,
    };

    it("offers the block control on an ordinary profile", () => {
        mockProfile({ profile: bob as never });

        render(<ProfilePage />);

        expect(screen.getByRole("button", { name: "Block" })).toBeEnabled();
        expect(screen.getByTestId("post-list")).toBeInTheDocument();
    });

    it("offers the way out of a block you wrote", () => {
        mockProfile({ profile: { ...bob, isBlocked: true } as never });

        render(<ProfilePage />);

        expect(screen.getByRole("button", { name: "Unblock" })).toBeEnabled();
        expect(screen.getByText("You blocked @bob")).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Follow" }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Message" }),
        ).not.toBeInTheDocument();
    });

    // Nothing to act on from this side: the block is theirs, and offering to
    // follow or write would offer something the API answers 403 and 400 to.
    it("states the wall and offers nothing when they blocked you", () => {
        mockProfile({ profile: { ...bob, isBlockedBy: true } as never });

        render(<ProfilePage />);

        expect(screen.getByText("@bob blocked you")).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Follow" }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Block" }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Unblock" }),
        ).not.toBeInTheDocument();
    });

    // Both rows exist independently; the unblock button is the only one of
    // the two that does anything for this reader, so it wins.
    it("treats a mutual block as your own", () => {
        mockProfile({
            profile: { ...bob, isBlocked: true, isBlockedBy: true } as never,
        });

        render(<ProfilePage />);

        expect(screen.getByRole("button", { name: "Unblock" })).toBeEnabled();
        expect(screen.getByText("You blocked @bob")).toBeInTheDocument();
    });

    /*
     * The timeline of a blocked account comes back empty, and an empty tab
     * reads as "this account has never written anything" — a different, wrong
     * statement. The notice stands in for the whole content area instead.
     */
    it("replaces the tabs and the timeline while a block stands", () => {
        mockProfile({ profile: { ...bob, isBlocked: true } as never });

        render(<ProfilePage />);

        expect(screen.queryByTestId("post-list")).not.toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Posts" }),
        ).not.toBeInTheDocument();
    });
});
