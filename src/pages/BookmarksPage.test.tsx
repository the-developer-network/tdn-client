import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthModalStore } from "../features/auth/store/auth-modal.store";
import { useBookmarks } from "../features/feed/hooks/useBookmarks";
import { useAuthStore } from "../core/auth/auth.store";
import BookmarksPage from "./BookmarksPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual =
        await vi.importActual<typeof import("react-router-dom")>(
            "react-router-dom",
        );
    return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../shared/layout/PageShell", () => ({
    PageShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("../features/feed/components/PostList", () => ({
    PostList: () => <div data-testid="post-list" />,
}));
vi.mock("../features/comment/components/CommentList", () => ({
    CommentList: () => <div data-testid="comment-list" />,
}));
vi.mock("../features/feed/hooks/useBookmarks", () => ({
    useBookmarks: vi.fn(),
}));
vi.mock("../core/auth/auth.store", () => ({ useAuthStore: vi.fn() }));
vi.mock("../features/auth/store/auth-modal.store", () => ({
    useAuthModalStore: vi.fn(),
}));
vi.mock("../shared/components/TrendingTopicsWidget", () => ({
    TrendingTopicsWidget: () => null,
}));

function makeAuth(isAuthenticated: boolean) {
    return {
        isAuthenticated,
        user: isAuthenticated ? { username: "alice" } : null,
    } as unknown as ReturnType<typeof useAuthStore>;
}

function makeAuthModal() {
    return {
        openModal: vi.fn(),
        setStep: vi.fn(),
    } as unknown as ReturnType<typeof useAuthModalStore>;
}

beforeEach(() => {
    mockNavigate.mockClear();
    vi.mocked(useAuthStore).mockReturnValue(makeAuth(true));
    vi.mocked(useAuthModalStore).mockReturnValue(makeAuthModal());
    vi.mocked(useBookmarks).mockReturnValue({
        posts: [],
        comments: [],
        isLoading: false,
        error: null,
        fetchBookmarks: vi.fn(),
        retry: vi.fn(),
        removePost: vi.fn(),
    } as unknown as ReturnType<typeof useBookmarks>);
});

describe("BookmarksPage", () => {
    it("renders nothing and redirects when unauthenticated", () => {
        vi.mocked(useAuthStore).mockReturnValue(makeAuth(false));
        const { container } = render(<BookmarksPage />);
        expect(container.firstChild).toBeNull();
        expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    });

    it("renders a spinner while bookmarks are loading", () => {
        vi.mocked(useBookmarks).mockReturnValue({
            posts: [],
            comments: [],
            isLoading: true,
            error: null,
            fetchBookmarks: vi.fn(),
            retry: vi.fn(),
            removePost: vi.fn(),
        } as unknown as ReturnType<typeof useBookmarks>);
        const { container } = render(<BookmarksPage />);
        expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    });

    it("renders the empty state when there are no bookmarks", () => {
        render(<BookmarksPage />);
        expect(screen.getByText("Save posts for later")).toBeInTheDocument();
    });
});
