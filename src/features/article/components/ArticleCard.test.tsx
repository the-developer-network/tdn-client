import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const navigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual =
        await vi.importActual<typeof import("react-router-dom")>(
            "react-router-dom",
        );
    return { ...actual, useNavigate: () => navigate };
});

import { ArticleCard } from "./ArticleCard";
import type { ArticleSummary } from "../api/article.types";

const article: ArticleSummary = {
    isSensitive: false,
    id: "article-1",
    slug: "clean-architecture",
    title: "Clean Architecture",
    excerpt: "Keeping transport concerns out of the domain layer.",
    coverImageUrl: "https://example.com/cover.png",
    coverImageAlt: "A cover",
    readingTimeMinutes: 7,
    likeCount: 3,
    commentCount: 2,
    isLiked: false,
    isBookmarked: false,
    status: "PUBLISHED",
    publishedAt: "2026-08-01T10:00:00.000Z",
    createdAt: "2026-07-01T10:00:00.000Z",
    author: {
        id: "user-1",
        username: "testuser",
        fullName: "Test User",
        avatarUrl: "https://example.com/avatar.png",
    },
    tags: [{ name: "fastify" }, { name: "prisma" }],
    categories: ["BACKEND"],
};

const renderCard = (overrides: Partial<ArticleSummary> = {}) =>
    render(
        <MemoryRouter>
            <ArticleCard {...article} {...overrides} />
        </MemoryRouter>,
    );

describe("ArticleCard", () => {
    it("shows the title, excerpt, reading time and counts", () => {
        renderCard();

        expect(screen.getByText("Clean Architecture")).toBeInTheDocument();
        expect(
            screen.getByText(
                "Keeping transport concerns out of the domain layer.",
            ),
        ).toBeInTheDocument();
        expect(screen.getByText("7 min read")).toBeInTheDocument();
        expect(screen.getByText("3")).toBeInTheDocument();
        expect(screen.getByText("2")).toBeInTheDocument();
    });

    // The excerpt is derived from the body server-side with markdown marks
    // stripped but HTML left intact, so it has to reach the DOM as text.
    it("renders the excerpt as text, never as markup", () => {
        const { container } = renderCard({
            excerpt: "<img src=x onerror=alert(1)>",
        });

        expect(container.querySelector("img[onerror]")).toBeNull();
        expect(
            screen.getByText("<img src=x onerror=alert(1)>"),
        ).toBeInTheDocument();
    });

    it("navigates to the article by slug", async () => {
        const user = userEvent.setup();
        renderCard();

        await user.click(screen.getByText("Clean Architecture"));

        expect(navigate).toHaveBeenCalledWith("/articles/clean-architecture");
    });

    it("goes to the author's profile without opening the article", async () => {
        const user = userEvent.setup();
        navigate.mockClear();
        renderCard();

        await user.click(screen.getByText("Test User"));

        expect(navigate).toHaveBeenCalledWith("/profile/testuser");
        expect(navigate).not.toHaveBeenCalledWith(
            "/articles/clean-architecture",
        );
    });

    it("drops a cover image whose protocol is not trusted", () => {
        const { container } = renderCard({
            coverImageUrl: "javascript:alert(1)",
        });

        // An allowlist rather than a denylist. The security bot's suggestion
        // extended the banned list to data: and vbscript:, which is right as
        // far as it goes — but any scheme left off the list still passes.
        // Requiring http(s) closes the whole class instead, and the avatar,
        // the only image that should survive here, is https.
        const rendered = [...container.querySelectorAll("img")].map(
            (img) => img.src,
        );
        expect(rendered.every((src) => /^https?:/.test(src))).toBe(true);
    });

    // A cover is optional on the API and absent on most articles, so the card
    // has to collapse rather than leave an empty slot where a picture would go.
    it("collapses the image slot when there is no cover", () => {
        const { container } = renderCard({ coverImageUrl: null });

        expect(screen.getByText("Clean Architecture")).toBeInTheDocument();
        // The avatar is the only image left, and nothing renders with an
        // empty src — which is what an unreserved slot would look like.
        expect(container.querySelectorAll("img")).toHaveLength(1);
        expect(container.querySelector("img[src='']")).toBeNull();
    });

    it("falls back to createdAt when the article was never published", () => {
        renderCard({ publishedAt: null });

        // Asserted against the same formatter the component uses — the literal
        // string depends on the runner's locale data, not on the component.
        const expected = new Date(article.createdAt).toLocaleDateString("en", {
            day: "numeric",
            month: "short",
        });
        expect(screen.getByText(expected)).toBeInTheDocument();
    });
});
