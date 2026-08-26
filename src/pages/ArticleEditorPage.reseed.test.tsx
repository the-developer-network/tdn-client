import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
vi.mock("../core/auth/auth.store", () => ({ useAuthStore: vi.fn() }));

// Deliberately NOT mocking useArticleEditor: this file exists to check that
// the editor's seeded state follows the article being edited, which is a
// property of the real hook plus how the page mounts it.
import { useArticle } from "../features/article/hooks/useArticle";
import { useAuthStore } from "../core/auth/auth.store";
import ArticleEditorPage from "./ArticleEditorPage";
import type { Article } from "../features/article/api/article.types";

const article = (id: string, title: string, body: string): Article => ({
    id,
    slug: `slug-${id}`,
    title,
    excerpt: "",
    body,
    coverImageUrl: null,
    coverImageAlt: null,
    readingTimeMinutes: 1,
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
});

const showArticle = (a: Article) => {
    vi.mocked(useArticle).mockReturnValue({
        article: a,
        isLoading: false,
        error: null,
        retry: vi.fn(),
    });
};

beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(useAuthStore).mockReturnValue(
        true as unknown as ReturnType<typeof useAuthStore>,
    );
});

describe("ArticleEditorPage, moving between articles", () => {
    /**
     * `useArticleEditor` seeds its state in `useState` initialisers, which run
     * once per mount. Going from one article's edit URL to another keeps the
     * component mounted, so without a key the editor keeps the first
     * article's text while the URL claims the second — and the next autosave
     * writes it back to whichever id the hook is still holding.
     */
    it("reseeds the editor when the article being edited changes", async () => {
        params.slug = "slug-a";
        showArticle(article("a", "Article A", "Body of A."));

        const { rerender } = render(<ArticleEditorPage />);
        expect(screen.getByLabelText("Title")).toHaveValue("Article A");

        params.slug = "slug-b";
        showArticle(article("b", "Article B", "Body of B."));
        rerender(<ArticleEditorPage />);

        await waitFor(() =>
            expect(screen.getByLabelText("Title")).toHaveValue("Article B"),
        );
        expect(
            screen.getByLabelText("Write your article in Markdown..."),
        ).toHaveValue("Body of B.");
    });
});
