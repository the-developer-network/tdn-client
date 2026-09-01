import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// PostCard now reaches `useAuthStore` (to gate the quote composer), which uses
// Zustand `persist` and captures localStorage at module-evaluation time. The
// Map-backed stub has to exist before any import runs.
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

import { useAuthStore } from "../../../core/auth/auth.store";
import { useAuthModalStore } from "../../auth/store/auth-modal.store";
import type { Post } from "../api/feed.types";
import { usePostActions } from "../hooks/usePostActions";
import { useTranslation } from "../../../shared/hooks/useTranslation";
import { PostCard } from "./PostCard";

// Replace useNavigate with a spy so PostCard and RichText don't need a Router.
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual =
        await vi.importActual<typeof import("react-router-dom")>(
            "react-router-dom",
        );
    return { ...actual, useNavigate: () => mockNavigate };
});

// Mock hooks to isolate PostCard's own rendering/navigation/modal logic.
vi.mock("../hooks/usePostActions", () => ({ usePostActions: vi.fn() }));
vi.mock("../../../shared/hooks/useTranslation", () => ({
    useTranslation: vi.fn(),
}));

type PostActionsReturn = ReturnType<typeof usePostActions>;
type TranslationReturn = ReturnType<typeof useTranslation>;

const makeActions = (
    overrides: Partial<PostActionsReturn> = {},
): PostActionsReturn =>
    ({
        isLiked: false,
        likeCount: 3,
        isLikeLoading: false,
        handleLike: vi.fn(),
        isBookmarked: false,
        isBookmarkLoading: false,
        handleBookmark: vi.fn(),
        handleShare: vi.fn(),
        quoteCount: 0,
        registerQuote: vi.fn(),
        isDeleteLoading: false,
        handleDelete: vi.fn().mockResolvedValue(false),
        ...overrides,
    }) as unknown as PostActionsReturn;

const makeTranslation = (content: string): TranslationReturn => ({
    displayContent: content,
    isTranslated: false,
    isTranslating: false,
    translateError: null,
    showTranslate: false,
    handleTranslate: vi.fn(),
    handleRevert: vi.fn(),
});

// The selection tests spy on `window.getSelection`, which `user-event` also
// reads while typing. Leaving it stubbed would strand any later spec that
// types into a field.
afterEach(() => {
    vi.restoreAllMocks();
});

beforeEach(() => {
    mockNavigate.mockClear();
    useAuthStore.setState(useAuthStore.getInitialState());
    useAuthModalStore.setState(useAuthModalStore.getInitialState());
    vi.mocked(usePostActions).mockReturnValue(makeActions());
    vi.mocked(useTranslation).mockImplementation((content) =>
        makeTranslation(content),
    );
});

const mockPost: Post = {
    isSensitive: false,
    mediaPending: false,
    id: "post-1",
    content: "Hello world",
    type: "COMMUNITY",
    mediaUrls: [],
    createdAt: new Date().toISOString(),
    likeCount: 3,
    commentCount: 2,
    isLiked: false,
    isBookmarked: false,
    quoteCount: 0,
    quotedPost: null,
    author: {
        id: "u1",
        username: "alice",
        fullName: "Alice Smith",
        avatarUrl: "https://cdn.example.com/avatars/alice.png",
        isMe: false,
    },
    tags: [],
};

describe("PostCard", () => {
    it("renders the author name and post content", () => {
        render(<PostCard {...mockPost} />);
        expect(screen.getByText("Alice Smith")).toBeInTheDocument();
        expect(screen.getByText("Hello world")).toBeInTheDocument();
    });

    it("navigates to /post/:id when the card article is clicked", () => {
        render(<PostCard {...mockPost} />);
        fireEvent.click(screen.getByRole("article"));
        expect(mockNavigate).toHaveBeenCalledWith("/post/post-1");
    });

    it("navigates to /profile/:username when the avatar image is clicked", () => {
        render(<PostCard {...mockPost} />);
        fireEvent.click(screen.getByAltText("alice"));
        expect(mockNavigate).toHaveBeenCalledWith("/profile/alice");
    });

    describe("clicks the card must not act on", () => {
        const withVideo: Post = {
            ...mockPost,
            mediaUrls: ["https://cdn.example.com/clip.mp4"],
        };

        // `<video controls>` puts its play, seek, volume and fullscreen
        // controls inside the card. Every one of them is a click that
        // bubbles, so the first press on play navigated away and the video
        // could not be operated in the feed at all. `CommentCard` stops the
        // same event on its media wrapper; this one did not.
        it("does not navigate when the video is clicked", () => {
            const { container } = render(<PostCard {...withVideo} />);
            const video = container.querySelector("video");

            expect(video).not.toBeNull();
            fireEvent.click(video!);

            expect(mockNavigate).not.toHaveBeenCalled();
        });

        // Releasing a drag-select fires a click on the article, so reading a
        // post carefully enough to quote from it threw the reader onto
        // another page and lost the selection.
        it("does not navigate when the click ends a text selection", () => {
            render(<PostCard {...mockPost} />);

            vi.spyOn(window, "getSelection").mockReturnValue({
                toString: () => "Hello",
            } as unknown as Selection);

            fireEvent.click(screen.getByRole("article"));

            expect(mockNavigate).not.toHaveBeenCalled();
        });

        it("still navigates when the selection is empty", () => {
            render(<PostCard {...mockPost} />);

            vi.spyOn(window, "getSelection").mockReturnValue({
                toString: () => "",
            } as unknown as Selection);

            fireEvent.click(screen.getByRole("article"));

            expect(mockNavigate).toHaveBeenCalledWith("/post/post-1");
        });
    });

    it("opens the delete confirmation modal when the delete button is clicked", () => {
        render(
            <PostCard
                {...mockPost}
                author={{ ...mockPost.author, isMe: true }}
            />,
        );
        fireEvent.click(screen.getByRole("button", { name: /delete post/i }));
        expect(screen.getByText("Delete post?")).toBeInTheDocument();
    });

    it("closes the delete modal after handleDelete resolves to true", async () => {
        const handleDelete = vi.fn().mockResolvedValue(true);
        vi.mocked(usePostActions).mockReturnValue(
            makeActions({ handleDelete }),
        );
        render(
            <PostCard
                {...mockPost}
                author={{ ...mockPost.author, isMe: true }}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: /delete post/i }));
        expect(screen.getByText("Delete post?")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
        await waitFor(() =>
            expect(screen.queryByText("Delete post?")).not.toBeInTheDocument(),
        );
    });

    describe("moderated media", () => {
        it("covers the media of a post the server flagged", () => {
            const { container } = render(
                <PostCard
                    {...mockPost}
                    isSensitive
                    mediaUrls={["https://cdn.example.com/a.png"]}
                />,
            );

            expect(screen.getByText("Sensitive content")).toBeInTheDocument();
            expect(container.querySelector(".blur-2xl")).toBeInTheDocument();
        });

        /*
         * `mediaUrls` is `[]` while a video is being checked, which is the
         * same thing an ordinary text post sends. `mediaPending` is the only
         * thing telling them apart, and without the placeholder the author
         * sees a post with no video and concludes it failed to upload.
         */
        it("stands in for a video that is still being checked", () => {
            render(<PostCard {...mockPost} mediaPending mediaUrls={[]} />);

            expect(
                screen.getByText("This video is being checked"),
            ).toBeInTheDocument();
        });

        it("says nothing about media on an ordinary post", () => {
            render(<PostCard {...mockPost} mediaUrls={[]} />);

            expect(
                screen.queryByText("This video is being checked"),
            ).not.toBeInTheDocument();
            expect(
                screen.queryByText("Sensitive content"),
            ).not.toBeInTheDocument();
        });
    });

    describe("quotes", () => {
        const quotedPost = {
            isSensitive: false,
            mediaPending: false,
            id: "quoted-1",
            content: "the original take",
            mediaUrls: [],
            createdAt: "2026-08-29T10:00:00.000Z",
            author: {
                id: "u2",
                username: "veli",
                fullName: "Veli K.",
                avatarUrl: "https://cdn.example.com/avatars/veli.png",
            },
        };

        it("renders the embedded card when the post quotes another", () => {
            render(<PostCard {...mockPost} quotedPost={quotedPost} />);
            expect(screen.getByText("the original take")).toBeInTheDocument();
            expect(screen.getByText("@veli")).toBeInTheDocument();
        });

        it("renders no embedded card on an ordinary post", () => {
            render(<PostCard {...mockPost} />);
            expect(screen.queryByText("@veli")).not.toBeInTheDocument();
        });

        it("hides the quote badge when nothing has quoted the post", () => {
            render(<PostCard {...mockPost} />);
            expect(
                screen.queryByRole("button", { name: /view quotes/i }),
            ).not.toBeInTheDocument();
        });

        it("navigates to the quotes list when the badge is clicked", () => {
            vi.mocked(usePostActions).mockReturnValue(
                makeActions({ quoteCount: 4 }),
            );
            render(<PostCard {...mockPost} quoteCount={4} />);

            const badge = screen.getByRole("button", { name: /view quotes/i });
            expect(badge).toHaveTextContent("4");

            fireEvent.click(badge);
            expect(mockNavigate).toHaveBeenCalledWith("/posts/post-1/quotes");
        });

        it("draws an empty-content quote as a repost rather than a blank body", () => {
            render(
                <PostCard {...mockPost} content="" quotedPost={quotedPost} />,
            );

            expect(screen.getByText("reposted")).toBeInTheDocument();
            expect(screen.getByText("the original take")).toBeInTheDocument();
        });

        it("keeps the repost marker off a quote that has its own text", () => {
            render(<PostCard {...mockPost} quotedPost={quotedPost} />);
            expect(screen.queryByText("reposted")).not.toBeInTheDocument();
            expect(screen.getByText("Hello world")).toBeInTheDocument();
        });

        it("opens the composer for a signed-in reader", () => {
            useAuthStore.setState({
                user: null,
                token: null,
                isAuthenticated: true,
            });
            render(<PostCard {...mockPost} />);

            fireEvent.click(
                screen.getByRole("button", { name: /quote post/i }),
            );

            expect(
                screen.getByPlaceholderText(/add a comment/i),
            ).toBeInTheDocument();
        });

        it("sends a signed-out reader to the auth modal instead of the composer", () => {
            useAuthStore.setState({
                user: null,
                token: null,
                isAuthenticated: false,
            });
            const openModal = vi.fn();
            useAuthModalStore.setState({ openModal });

            render(<PostCard {...mockPost} />);
            fireEvent.click(
                screen.getByRole("button", { name: /quote post/i }),
            );

            expect(openModal).toHaveBeenCalled();
            expect(
                screen.queryByPlaceholderText(/add a comment/i),
            ).not.toBeInTheDocument();
        });
    });
});
