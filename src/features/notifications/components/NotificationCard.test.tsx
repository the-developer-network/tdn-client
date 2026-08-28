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
});
