import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Comment } from "../api/comment.types";
import { useCommentActions } from "../hooks/useCommentActions";
import { useTranslation } from "../../../shared/hooks/useTranslation";
import { CommentCard } from "./CommentCard";

// Replace useNavigate with a spy so CommentCard and RichText don't need a Router.
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual =
        await vi.importActual<typeof import("react-router-dom")>(
            "react-router-dom",
        );
    return { ...actual, useNavigate: () => mockNavigate };
});

// Mock hooks to isolate CommentCard's own rendering/navigation/modal logic.
vi.mock("../hooks/useCommentActions", () => ({ useCommentActions: vi.fn() }));
vi.mock("../../../shared/hooks/useTranslation", () => ({
    useTranslation: vi.fn(),
}));

type CommentActionsReturn = ReturnType<typeof useCommentActions>;
type TranslationReturn = ReturnType<typeof useTranslation>;

const makeActions = (
    overrides: Partial<CommentActionsReturn> = {},
): CommentActionsReturn =>
    ({
        isLiked: false,
        likeCount: 0,
        isLikeLoading: false,
        handleLike: vi.fn(),
        isBookmarked: false,
        isBookmarkLoading: false,
        handleSave: vi.fn(),
        handleShare: vi.fn(),
        isDeleteLoading: false,
        handleDelete: vi.fn().mockResolvedValue(false),
        ...overrides,
    }) as unknown as CommentActionsReturn;

const makeTranslation = (content: string): TranslationReturn => ({
    displayContent: content,
    isTranslated: false,
    isTranslating: false,
    translateError: null,
    showTranslate: false,
    handleTranslate: vi.fn(),
    handleRevert: vi.fn(),
});

// The selection test spies on `window.getSelection`, which `user-event` also
// reads while typing. Leaving it stubbed would strand any later spec that
// types into a field.
afterEach(() => {
    vi.restoreAllMocks();
});

beforeEach(() => {
    mockNavigate.mockClear();
    vi.mocked(useCommentActions).mockReturnValue(makeActions());
    vi.mocked(useTranslation).mockImplementation((content) =>
        makeTranslation(content),
    );
});

const mockComment: Comment = {
    id: "c1",
    content: "Test comment",
    mediaUrls: [],
    createdAt: new Date().toISOString(),
    likeCount: 0,
    replyCount: 0,
    isLiked: false,
    isBookmarked: false,
    author: {
        id: "u1",
        username: "alice",
        avatarUrl: "",
        isMe: false,
    },
    parentId: null,
    postId: "post-1",
};

describe("CommentCard", () => {
    it("renders the author username and comment content", () => {
        render(<CommentCard comment={mockComment} />);
        expect(screen.getByText("@alice")).toBeInTheDocument();
        expect(screen.getByText("Test comment")).toBeInTheDocument();
    });

    it("navigates to /comments/:id when the card is clicked", () => {
        render(<CommentCard comment={mockComment} />);
        fireEvent.click(screen.getByRole("article"));
        expect(mockNavigate).toHaveBeenCalledWith("/comments/c1");
    });

    // Releasing a drag-select fires a click on the article, so quoting a
    // comment threw the reader onto another page and lost the selection.
    it("does not navigate when the click ends a text selection", () => {
        render(<CommentCard comment={mockComment} />);

        vi.spyOn(window, "getSelection").mockReturnValue({
            toString: () => "Nice",
        } as unknown as Selection);

        fireEvent.click(screen.getByRole("article"));

        expect(mockNavigate).not.toHaveBeenCalled();
    });

    // `CommentAuthorSchema` marks `username` optional, so the key is absent
    // whenever the author relation is gone.
    describe("an author the API did not name", () => {
        const anonymous: Comment = {
            ...mockComment,
            author: {
                id: "u1",
                avatarUrl: "",
                isMe: false,
            } as unknown as Comment["author"],
        };

        it("does not render the literal string undefined as a handle", () => {
            const { container } = render(<CommentCard comment={anonymous} />);
            expect(container.textContent).not.toContain("undefined");
        });

        it("does not route the avatar to /profile/undefined", () => {
            const { container } = render(<CommentCard comment={anonymous} />);

            fireEvent.click(container.querySelector("img")!);

            expect(mockNavigate).not.toHaveBeenCalledWith("/profile/undefined");
        });
    });

    it("refuses an avatar url that is not a real image protocol", () => {
        render(
            <CommentCard
                comment={{
                    ...mockComment,
                    author: {
                        ...mockComment.author,
                        avatarUrl: "javascript:alert(1)",
                    },
                }}
            />,
        );

        const avatar = screen.getByAltText("alice") as HTMLImageElement;
        expect(avatar.getAttribute("src")).not.toContain("javascript:");
    });

    it("opens the delete confirmation modal when the delete button is clicked", () => {
        render(
            <CommentCard
                comment={{
                    ...mockComment,
                    author: { ...mockComment.author, isMe: true },
                }}
            />,
        );
        fireEvent.click(
            screen.getByRole("button", { name: /delete comment/i }),
        );
        expect(screen.getByText("Delete comment?")).toBeInTheDocument();
    });

    it("closes the delete modal after handleDelete resolves to true", async () => {
        const handleDelete = vi.fn().mockResolvedValue(true);
        vi.mocked(useCommentActions).mockReturnValue(
            makeActions({ handleDelete }),
        );
        render(
            <CommentCard
                comment={{
                    ...mockComment,
                    author: { ...mockComment.author, isMe: true },
                }}
            />,
        );

        fireEvent.click(
            screen.getByRole("button", { name: /delete comment/i }),
        );
        expect(screen.getByText("Delete comment?")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
        await waitFor(() =>
            expect(
                screen.queryByText("Delete comment?"),
            ).not.toBeInTheDocument(),
        );
    });
});
