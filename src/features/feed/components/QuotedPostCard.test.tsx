import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { QuotedPost } from "../api/feed.types";
import { QuotedPostCard } from "./QuotedPostCard";

// RichText also reaches for useNavigate, so the spy has to replace it for the
// whole module rather than only for this component.
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual =
        await vi.importActual<typeof import("react-router-dom")>(
            "react-router-dom",
        );
    return { ...actual, useNavigate: () => mockNavigate };
});

const quoted: QuotedPost = {
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

beforeEach(() => {
    mockNavigate.mockClear();
});

describe("QuotedPostCard", () => {
    it("renders the quoted author and content", () => {
        render(<QuotedPostCard post={quoted} />);
        expect(screen.getByText("Veli K.")).toBeInTheDocument();
        expect(screen.getByText("@veli")).toBeInTheDocument();
        expect(screen.getByText("the original take")).toBeInTheDocument();
    });

    it("navigates to the quoted post's detail page when clicked", () => {
        render(<QuotedPostCard post={quoted} />);
        fireEvent.click(screen.getByText("the original take"));
        expect(mockNavigate).toHaveBeenCalledWith("/post/quoted-1");
    });

    it("stops the click from reaching the surrounding post card", () => {
        const onOuterClick = vi.fn();
        render(
            <div onClick={onOuterClick}>
                <QuotedPostCard post={quoted} />
            </div>,
        );

        fireEvent.click(screen.getByText("the original take"));

        expect(onOuterClick).not.toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith("/post/quoted-1");
    });

    it("renders no like or bookmark control — the payload carries no state for one", () => {
        render(<QuotedPostCard post={quoted} />);
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("does not navigate while used as a composer preview", () => {
        render(<QuotedPostCard post={quoted} isPreview />);
        fireEvent.click(screen.getByText("the original take"));
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("renders an empty quoted content as no text rather than a blank line", () => {
        render(<QuotedPostCard post={{ ...quoted, content: "" }} />);
        expect(screen.getByText("@veli")).toBeInTheDocument();
        expect(screen.queryByText("the original take")).not.toBeInTheDocument();
    });

    it("renders attached media", () => {
        // `alt=""` makes the media decorative, so it has no img role to query.
        const { container } = render(
            <QuotedPostCard
                post={{
                    ...quoted,
                    mediaUrls: ["https://cdn.example.com/a.png"],
                }}
            />,
        );

        expect(
            container.querySelector('img[src="https://cdn.example.com/a.png"]'),
        ).not.toBeNull();
    });
});
