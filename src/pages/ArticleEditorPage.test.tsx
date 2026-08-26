import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigate = vi.fn();
const params: { slug?: string } = {};
vi.mock("react-router-dom", async () => {
    const actual =
        await vi.importActual<typeof import("react-router-dom")>(
            "react-router-dom",
        );
    return {
        ...actual,
        useNavigate: () => navigate,
        useParams: () => params,
    };
});

vi.mock("../shared/layout/PageShell", () => ({
    PageShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("../shared/components/ui/SEO", () => ({ SEO: () => null }));
vi.mock("../features/article/hooks/useArticle", () => ({
    useArticle: vi.fn(),
}));
vi.mock("../features/article/hooks/useArticleEditor", () => ({
    useArticleEditor: vi.fn(),
}));
vi.mock("../core/auth/auth.store", () => ({ useAuthStore: vi.fn() }));

import { useArticle } from "../features/article/hooks/useArticle";
import { useArticleEditor } from "../features/article/hooks/useArticleEditor";
import { useAuthStore } from "../core/auth/auth.store";
import ArticleEditorPage from "./ArticleEditorPage";
import type { Article } from "../features/article/api/article.types";

const article: Article = {
    id: "article-1",
    slug: "my-article",
    title: "My Article",
    excerpt: "",
    body: "# Heading\n\nBody text.",
    coverImageUrl: null,
    coverImageAlt: null,
    readingTimeMinutes: 2,
    likeCount: 0,
    commentCount: 0,
    isLiked: false,
    isBookmarked: false,
    status: "DRAFT",
    publishedAt: null,
    createdAt: new Date().toISOString(),
    author: { id: "user-1", username: "testuser", avatarUrl: "" },
    tags: [],
    categories: [],
};

const update = vi.fn();
const publish = vi.fn();
const save = vi.fn();

function mockEditor(
    overrides: Partial<ReturnType<typeof useArticleEditor>> = {},
) {
    vi.mocked(useArticleEditor).mockReturnValue({
        draft: {
            title: "",
            body: "",
            excerpt: "",
            coverAlt: "",
            tags: [],
            categories: [],
        },
        update,
        articleId: null,
        slug: null,
        status: null,
        existingCoverUrl: null,
        coverFile: null,
        setCoverFile: vi.fn(),
        removeExistingCover: vi.fn(),
        canSave: false,
        isDirty: false,
        isBusy: false,
        saveState: "idle",
        saveError: null,
        save,
        publish,
        archive: vi.fn(),
        remove: vi.fn(),
        ...overrides,
    } as ReturnType<typeof useArticleEditor>);
}

beforeEach(() => {
    vi.clearAllMocks();
    delete params.slug;
    vi.mocked(useAuthStore).mockReturnValue(
        true as unknown as ReturnType<typeof useAuthStore>,
    );
    vi.mocked(useArticle).mockReturnValue({
        article: null,
        isLoading: false,
        error: null,
        retry: vi.fn(),
    });
    mockEditor();
});

describe("ArticleEditorPage", () => {
    // Writing is not something a guest can start, and the editor would only
    // fail at its first save.
    it("sends a signed-out reader home instead of rendering the editor", () => {
        vi.mocked(useAuthStore).mockReturnValue(
            false as unknown as ReturnType<typeof useAuthStore>,
        );

        render(<ArticleEditorPage />);

        expect(navigate).toHaveBeenCalledWith("/", { replace: true });
        expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
    });

    it("opens a blank editor when there is no slug", () => {
        render(<ArticleEditorPage />);

        expect(screen.getByLabelText("Title")).toBeInTheDocument();
        // Nothing to load, so nothing should be waiting on the network.
        expect(useArticle).toHaveBeenCalledWith("");
    });

    it("types into the title and body", async () => {
        const user = userEvent.setup();
        render(<ArticleEditorPage />);

        await user.type(screen.getByLabelText("Title"), "A");

        expect(update).toHaveBeenCalledWith("title", "A");
    });

    it("says what is missing before anything can be saved", () => {
        render(<ArticleEditorPage />);

        expect(
            screen.getByText(
                "A title and some body text are needed before this can be saved.",
            ),
        ).toBeInTheDocument();
    });

    it("shows the save state once there is something to save", () => {
        mockEditor({ canSave: true, saveState: "saved", isDirty: false });
        render(<ArticleEditorPage />);

        expect(screen.getByText("Draft saved")).toBeInTheDocument();
    });

    it("offers a retry when the save failed", async () => {
        const user = userEvent.setup();
        mockEditor({
            canSave: true,
            saveState: "error",
            saveError: "Slow down.",
        });
        render(<ArticleEditorPage />);

        expect(screen.getByText("Slow down.")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Retry" }));
        expect(save).toHaveBeenCalledOnce();
    });

    describe("the preview", () => {
        it("renders the draft through the same markdown the reader gets", async () => {
            const user = userEvent.setup();
            mockEditor({
                draft: {
                    title: "My Article",
                    body: "# Heading\n\nBody text.",
                    excerpt: "",
                    coverAlt: "",
                    tags: [],
                    categories: [],
                },
                canSave: true,
            });
            render(<ArticleEditorPage />);

            await user.click(screen.getByRole("button", { name: "Preview" }));

            expect(
                screen.getByRole("heading", { level: 1, name: "Heading" }),
            ).toBeInTheDocument();
            expect(screen.getByText("Body text.")).toBeInTheDocument();
        });

        it("says there is nothing to preview yet", async () => {
            const user = userEvent.setup();
            render(<ArticleEditorPage />);

            await user.click(screen.getByRole("button", { name: "Preview" }));

            expect(
                screen.getByText("Nothing to preview yet."),
            ).toBeInTheDocument();
        });
    });

    describe("publishing", () => {
        it("is refused until there is something to publish", () => {
            render(<ArticleEditorPage />);

            expect(
                screen.getByRole("button", { name: "Publish" }),
            ).toBeDisabled();
        });

        it("publishes and goes to the article's reading page", async () => {
            const user = userEvent.setup();
            publish.mockResolvedValue({ ...article, status: "PUBLISHED" });
            mockEditor({ canSave: true, status: "DRAFT" });
            render(<ArticleEditorPage />);

            await user.click(screen.getByRole("button", { name: "Publish" }));

            await waitFor(() =>
                expect(navigate).toHaveBeenCalledWith("/articles/my-article"),
            );
        });

        // A failed publish must leave the writer in the editor with their text.
        it("stays put when publishing failed", async () => {
            const user = userEvent.setup();
            publish.mockResolvedValue(null);
            mockEditor({ canSave: true, status: "DRAFT" });
            render(<ArticleEditorPage />);

            await user.click(screen.getByRole("button", { name: "Publish" }));

            await waitFor(() => expect(publish).toHaveBeenCalled());
            expect(navigate).not.toHaveBeenCalled();
        });
    });

    describe("an article that is already published", () => {
        it("offers archive and delete rather than publish", () => {
            mockEditor({
                canSave: true,
                status: "PUBLISHED",
                slug: "my-article",
            });
            render(<ArticleEditorPage />);

            expect(
                screen.getByRole("button", { name: "Archive" }),
            ).toBeInTheDocument();
            expect(
                screen.getByRole("button", { name: "Delete" }),
            ).toBeInTheDocument();
            expect(
                screen.queryByRole("button", { name: "Publish" }),
            ).not.toBeInTheDocument();
        });

        it("confirms before deleting, since it cannot be undone", async () => {
            const user = userEvent.setup();
            mockEditor({ canSave: true, status: "PUBLISHED" });
            render(<ArticleEditorPage />);

            await user.click(screen.getByRole("button", { name: "Delete" }));

            expect(
                screen.getByText("Delete this article?"),
            ).toBeInTheDocument();
        });
    });

    describe("loading an article to edit", () => {
        it("waits for it rather than opening a blank editor", () => {
            params.slug = "my-article";
            vi.mocked(useArticle).mockReturnValue({
                article: null,
                isLoading: true,
                error: null,
                retry: vi.fn(),
            });

            const { container } = render(<ArticleEditorPage />);

            expect(
                container.querySelector(".animate-spin"),
            ).toBeInTheDocument();
            expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
        });
    });
});
