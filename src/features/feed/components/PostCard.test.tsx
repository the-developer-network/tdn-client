import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

beforeEach(() => {
    mockNavigate.mockClear();
    vi.mocked(usePostActions).mockReturnValue(makeActions());
    vi.mocked(useTranslation).mockImplementation((content) =>
        makeTranslation(content),
    );
});

const mockPost: Post = {
    id: "post-1",
    content: "Hello world",
    type: "COMMUNITY",
    mediaUrls: [],
    createdAt: new Date().toISOString(),
    likeCount: 3,
    commentCount: 2,
    isLiked: false,
    isBookmarked: false,
    author: {
        id: "u1",
        username: "alice",
        fullName: "Alice Smith",
        avatarUrl: "",
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
});
