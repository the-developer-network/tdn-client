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

    it("applies the blue left-border class when notification is unread", () => {
        const { container } = render(
            <NotificationCard notification={{ ...base, isRead: false }} />,
        );
        expect((container.firstChild as HTMLElement).className).toMatch(
            /border-l-blue-500/,
        );
    });
});
