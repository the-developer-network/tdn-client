import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { MessageBubble } from "./MessageBubble";
import type { Message } from "../api/message.types";

function message(overrides: Partial<Message> = {}): Message {
    return {
        id: "m1",
        conversationId: "c1",
        senderId: "u2",
        content: "hello",
        mediaUrls: [],
        isSensitive: false,
        mediaPending: false,
        mediaRejected: false,
        isDeleted: false,
        isMine: false,
        createdAt: "2026-09-03T12:00:00.000Z",
        ...overrides,
    };
}

// `RichText` links through the router, so every bubble needs one.
function renderBubble(props: Partial<Parameters<typeof MessageBubble>[0]>) {
    return render(
        <MemoryRouter>
            <MessageBubble message={message()} {...props} />
        </MemoryRouter>,
    );
}

describe("MessageBubble", () => {
    it("renders the text of an ordinary message", () => {
        renderBubble({});

        expect(screen.getByText("hello")).toBeInTheDocument();
    });

    /*
     * The row survives its own content. The other participant may have replied
     * to it, and removing it would leave that reply answering nothing.
     */
    it("shows a withdrawn message as a tombstone rather than removing it", () => {
        renderBubble({
            message: message({ isDeleted: true, content: "" }),
        });

        expect(
            screen.getByText("This message was deleted"),
        ).toBeInTheDocument();
    });

    it("stands in for a video that is still being checked", () => {
        const onRefresh = vi.fn();
        renderBubble({
            message: message({ mediaPending: true }),
            onRefresh,
        });

        expect(
            screen.getByText("This video is being checked"),
        ).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /refresh/i }));
        expect(onRefresh).toHaveBeenCalled();
    });

    /*
     * The one place the app says "media removed" out loud. For a post the rule
     * is the opposite, because there a rejection is byte-for-byte a post that
     * never had media — here the server states it in a field, so both sides
     * read the same row and nothing is reconstructed.
     */
    it("says so when moderation refused the attachments", () => {
        renderBubble({
            message: message({ mediaRejected: true }),
        });

        expect(screen.getByText("Media removed")).toBeInTheDocument();
    });

    it("covers flagged media until it is asked for", () => {
        renderBubble({
            message: message({
                isSensitive: true,
                mediaUrls: ["https://cdn.example/a.jpg"],
            }),
        });

        expect(screen.getByText("Sensitive content")).toBeInTheDocument();
    });

    it("renders media uncovered when it is not flagged", () => {
        const { container } = renderBubble({
            message: message({ mediaUrls: ["https://cdn.example/a.jpg"] }),
        });

        expect(screen.queryByText("Sensitive content")).toBeNull();
        expect(container.querySelector("img")).toHaveAttribute(
            "src",
            "https://cdn.example/a.jpg",
        );
    });

    it("plays a video attachment rather than showing it as an image", () => {
        const { container } = renderBubble({
            message: message({ mediaUrls: ["https://cdn.example/a.mp4"] }),
        });

        expect(container.querySelector("video")).toBeInTheDocument();
        expect(container.querySelector("img")).toBeNull();
    });

    describe("the delete affordance", () => {
        it("is offered on your own acknowledged message", () => {
            renderBubble({
                message: message({ isMine: true }),
                onDelete: vi.fn(),
            });

            expect(
                screen.getByRole("button", { name: "Delete message" }),
            ).toBeInTheDocument();
        });

        // Only the sender may withdraw a message, so the control is not shown
        // where the request would be refused.
        it("is not offered on someone else message", () => {
            renderBubble({
                message: message({ isMine: false }),
                onDelete: vi.fn(),
            });

            expect(
                screen.queryByRole("button", { name: "Delete message" }),
            ).toBeNull();
        });

        // A bubble the server has not acknowledged has no id to withdraw.
        it("is not offered while the message is still being sent", () => {
            renderBubble({
                message: message({ id: "temp-1", isMine: true }),
                onDelete: vi.fn(),
            });

            expect(
                screen.queryByRole("button", { name: "Delete message" }),
            ).toBeNull();
        });

        it("confirms before withdrawing", () => {
            const onDelete = vi.fn();
            renderBubble({ message: message({ isMine: true }), onDelete });

            fireEvent.click(
                screen.getByRole("button", { name: "Delete message" }),
            );
            expect(onDelete).not.toHaveBeenCalled();

            expect(
                screen.getByText("Delete this message?"),
            ).toBeInTheDocument();
            fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

            expect(onDelete).toHaveBeenCalledWith("m1");
        });
    });

    describe("the read watermark", () => {
        /*
         * Read state is per conversation, not per message: a sent message
         * counts as seen once its `createdAt` precedes the moment the other
         * participant last opened the thread.
         */
        it("reads as seen when it predates the watermark", () => {
            renderBubble({
                message: message({ isMine: true }),
                otherLastReadAt: "2026-09-03T13:00:00.000Z",
            });

            expect(screen.getByText("Seen")).toBeInTheDocument();
        });

        it("reads as sent when the watermark is older than it", () => {
            renderBubble({
                message: message({ isMine: true }),
                otherLastReadAt: "2026-09-03T11:00:00.000Z",
            });

            expect(screen.getByText("Sent")).toBeInTheDocument();
        });

        it("says nothing about a message you did not send", () => {
            renderBubble({
                message: message({ isMine: false }),
                otherLastReadAt: "2026-09-03T13:00:00.000Z",
            });

            expect(screen.queryByText("Seen")).toBeNull();
            expect(screen.queryByText("Sent")).toBeNull();
        });
    });
});
