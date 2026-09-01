import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Notification } from "../api/notification.types";
import { NotificationCard } from "./NotificationCard";

// Replace useNavigate with a spy; keep all other react-router-dom exports real.
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual =
        await vi.importActual<typeof import("react-router-dom")>(
            "react-router-dom",
        );
    return { ...actual, useNavigate: () => mockNavigate };
});

beforeEach(() => {
    mockNavigate.mockClear();
});

const base: Notification = {
    recipientId: "user-1",
    issuerId: "user-2",
    username: "alice",
    type: "FOLLOW",
    avatarUrl: "",
    referenceId: null,
    createdAt: new Date().toISOString(),
    isRead: true,
};

describe("NotificationCard", () => {
    it("FOLLOW: navigates to /profile/:username on click", () => {
        render(<NotificationCard notification={{ ...base, type: "FOLLOW" }} />);
        fireEvent.click(screen.getByText(/@alice started following you/i));
        expect(mockNavigate).toHaveBeenCalledWith("/profile/alice");
    });

    it("LIKE: navigates to /post/:referenceId on click", () => {
        render(
            <NotificationCard
                notification={{
                    ...base,
                    type: "LIKE",
                    referenceId: "post-abc",
                }}
            />,
        );
        fireEvent.click(screen.getByText(/@alice liked your post/i));
        expect(mockNavigate).toHaveBeenCalledWith("/post/post-abc");
    });

    // NEW_POST was already wired end to end but never pinned by a test. The
    // API sets `referenceId` to the post's id for this type, so the card's
    // existing `/post/:referenceId` branch is the right destination.
    it("NEW_POST: renders its message and opens the post", () => {
        render(
            <NotificationCard
                notification={{
                    ...base,
                    type: "NEW_POST",
                    referenceId: "post-abc",
                }}
            />,
        );
        fireEvent.click(screen.getByText(/@alice published a new post/i));
        expect(mockNavigate).toHaveBeenCalledWith("/post/post-abc");
    });

    // A bot post notification with no reference cannot open a post; the
    // issuer's profile is the only destination left.
    it("NEW_POST: falls back to the profile without a referenceId", () => {
        render(
            <NotificationCard
                notification={{ ...base, type: "NEW_POST", referenceId: null }}
            />,
        );
        fireEvent.click(screen.getByText(/@alice published a new post/i));
        expect(mockNavigate).toHaveBeenCalledWith("/profile/alice");
    });

    it("COMMENT: navigates to /comments/:referenceId on click", () => {
        render(
            <NotificationCard
                notification={{
                    ...base,
                    type: "COMMENT",
                    referenceId: "comment-xyz",
                }}
            />,
        );
        fireEvent.click(screen.getByText(/@alice commented on your post/i));
        expect(mockNavigate).toHaveBeenCalledWith("/comments/comment-xyz");
    });

    // `COMMENT_REPLY` was missing from `NotificationType`, so it was also
    // missing from `MESSAGE_KEYS` — a `Record` keyed on that union cannot flag
    // a member the union does not have. `t(undefined)` then threw inside its
    // `{{var}}` interpolation, so one of these took down the whole list.
    it("COMMENT_REPLY: renders its own message", () => {
        render(
            <NotificationCard
                notification={{
                    ...base,
                    type: "COMMENT_REPLY",
                    referenceId: "comment-xyz",
                }}
            />,
        );
        expect(
            screen.getByText(/@alice replied to your comment/i),
        ).toBeInTheDocument();
    });

    it("COMMENT_REPLY: navigates to /comments/:referenceId on click", () => {
        render(
            <NotificationCard
                notification={{
                    ...base,
                    type: "COMMENT_REPLY",
                    referenceId: "comment-xyz",
                }}
            />,
        );
        fireEvent.click(screen.getByText(/@alice replied to your comment/i));
        expect(mockNavigate).toHaveBeenCalledWith("/comments/comment-xyz");
    });

    // The API owns the enum and can grow it whenever it likes; this build
    // cannot know the next value. Rendering something plain beats throwing.
    it("survives a type this build has never heard of", () => {
        const unknown = {
            ...base,
            type: "SOMETHING_NEW",
            referenceId: "ref-1",
        } as unknown as Notification;

        expect(() =>
            render(<NotificationCard notification={unknown} />),
        ).not.toThrow();
        expect(
            screen.getByText(/@alice sent you a notification/i),
        ).toBeInTheDocument();
    });

    it("falls back to the issuer's profile for an unknown type", () => {
        const unknown = {
            ...base,
            type: "SOMETHING_NEW",
            referenceId: "ref-1",
        } as unknown as Notification;

        render(<NotificationCard notification={unknown} />);
        fireEvent.click(screen.getByText(/@alice sent you a notification/i));
        expect(mockNavigate).toHaveBeenCalledWith("/profile/alice");
    });

    it("applies the blue left-border class when notification is unread", () => {
        const { container } = render(
            <NotificationCard notification={{ ...base, isRead: false }} />,
        );
        expect((container.firstChild as HTMLElement).className).toMatch(
            /border-l-blue-500/,
        );
    });

    it("QUOTE: renders the quote message", () => {
        render(
            <NotificationCard
                notification={{
                    ...base,
                    type: "QUOTE",
                    referenceId: "quote-1",
                }}
            />,
        );
        expect(
            screen.getByText(/@alice quoted your post/i),
        ).toBeInTheDocument();
    });

    describe("MEDIA_REJECTED", () => {
        /*
         * The platform has no account, so the API sets `issuerId` to the
         * recipient and fills `username`/`avatarUrl` with the recipient's own.
         * Rendered like any other row, the notice would show the reader their
         * own face and name over a message about breaking the rules.
         */
        const notice = {
            ...base,
            type: "MEDIA_REJECTED" as const,
            issuerId: "user-1",
            username: "alice",
            avatarUrl: "https://cdn.example.com/alice.png",
        };

        it("shows neither the issuer's avatar nor their name", () => {
            render(<NotificationCard notification={notice} />);

            expect(screen.queryByRole("img")).not.toBeInTheDocument();
            expect(screen.queryByText(/alice/i)).not.toBeInTheDocument();
            expect(
                screen.getByText(/removed for breaking the community rules/i),
            ).toBeInTheDocument();
        });

        it("goes to the comment when the media hung off one", () => {
            render(
                <NotificationCard
                    notification={{
                        ...notice,
                        postId: "post-1",
                        commentId: "comment-1",
                    }}
                />,
            );

            fireEvent.click(screen.getByText(/removed for breaking/i));

            // The comment is the more specific of the two, and the same route
            // serves a comment on an article.
            expect(mockNavigate).toHaveBeenCalledWith("/comments/comment-1");
        });

        it("goes to the article's comment, not the article", () => {
            render(
                <NotificationCard
                    notification={{
                        ...notice,
                        commentId: "comment-9",
                        articleId: "article-1",
                        articleSlug: "clean-architecture",
                    }}
                />,
            );

            fireEvent.click(screen.getByText(/removed for breaking/i));

            expect(mockNavigate).toHaveBeenCalledWith("/comments/comment-9");
        });

        it("goes to the post when the media hung off the post itself", () => {
            render(
                <NotificationCard
                    notification={{ ...notice, postId: "post-1" }}
                />,
            );

            fireEvent.click(screen.getByText(/removed for breaking/i));

            expect(mockNavigate).toHaveBeenCalledWith("/post/post-1");
        });

        /*
         * A real case, not a defensive one: a video uploaded on a post that
         * was never sent is still checked, so the notice arrives attached to
         * nothing. Without this the row would fall through to the default
         * branch and open the reader's own profile, which explains nothing.
         */
        it("is inert when the media was never attached to anything", () => {
            render(<NotificationCard notification={notice} />);

            fireEvent.click(screen.getByText(/removed for breaking/i));

            expect(mockNavigate).not.toHaveBeenCalled();
        });
    });

    it("QUOTE: navigates to the quote itself, not the post that was quoted", () => {
        render(
            <NotificationCard
                notification={{
                    ...base,
                    type: "QUOTE",
                    referenceId: "quote-1",
                }}
            />,
        );

        fireEvent.click(screen.getByText(/@alice quoted your post/i));

        expect(mockNavigate).toHaveBeenCalledWith("/post/quote-1");
    });

    it("QUOTE: falls back to the issuer's profile with no referenceId", () => {
        render(
            <NotificationCard
                notification={{ ...base, type: "QUOTE", referenceId: null }}
            />,
        );

        fireEvent.click(screen.getByText(/@alice quoted your post/i));

        expect(mockNavigate).toHaveBeenCalledWith("/profile/alice");
    });
});
