import { beforeEach, describe, expect, it } from "vitest";
import { useMessageStore } from "./message.store";
import type {
    Conversation,
    IncomingMessagePayload,
    Message,
} from "../api/message.types";

function conversation(overrides: Partial<Conversation> = {}): Conversation {
    return {
        id: "c1",
        status: "ACCEPTED",
        isRequest: false,
        canSend: true,
        participant: {
            id: "u2",
            username: "ayse",
            fullName: "Ayse Y.",
            avatarUrl: "https://example.com/a.png",
        },
        unreadCount: 0,
        lastMessagePreview: "older",
        lastMessageAt: "2026-09-01T00:00:00.000Z",
        otherLastReadAt: null,
        createdAt: "2026-09-01T00:00:00.000Z",
        ...overrides,
    };
}

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

function incoming(
    overrides: Partial<IncomingMessagePayload> = {},
): IncomingMessagePayload {
    return {
        conversationId: "c1",
        messageId: "m9",
        senderId: "u2",
        preview: "newest",
        hasMedia: false,
        createdAt: "2026-09-03T13:00:00.000Z",
        ...overrides,
    };
}

const get = () => useMessageStore.getState();

beforeEach(() => {
    useMessageStore.setState(useMessageStore.getInitialState());
});

describe("the unread badge", () => {
    /*
     * The lesson `notification.store.ts` already learned, restated here
     * because the same shortcut is available and just as wrong: an account
     * with 35 unread messages would show 20, because that is the page size.
     */
    it("is not defined by the loaded list", () => {
        get().setConversations(
            [
                conversation({ id: "c1", unreadCount: 7 }),
                conversation({ id: "c2", unreadCount: 5 }),
            ],
            null,
        );

        expect(get().unreadCount).toBe(0);

        get().setUnreadCount(12);
        get().setConversations(
            [conversation({ id: "c3", unreadCount: 1 })],
            null,
        );

        expect(get().unreadCount).toBe(12);
    });

    it("rises for a message in a thread nobody is looking at", () => {
        get().setConversations([conversation()], null);

        get().applyIncoming(incoming());

        expect(get().unreadCount).toBe(1);
        expect(get().conversations[0].unreadCount).toBe(1);
    });

    /*
     * The thread on screen is read as the message lands, so a badge raised for
     * it is a number the reader can only clear by leaving and coming back.
     */
    it("does not rise for the thread the reader is focused on", () => {
        get().setConversations([conversation()], null);
        get().setFocusedConversation("c1");

        get().applyIncoming(incoming());

        expect(get().unreadCount).toBe(0);
        expect(get().conversations[0].unreadCount).toBe(0);
    });

    it("asks the open thread to re-read, because the payload is not a message", () => {
        get().setFocusedConversation("c1");
        const before = get().threadRevision;

        get().applyIncoming(incoming());

        // `preview` is truncated and there is no `content`, so a bubble cannot
        // be built from it — only a reason to fetch one.
        expect(get().threadRevision).toBe(before + 1);
    });

    it("asks the list to re-read when the thread is not in the loaded page", () => {
        get().setConversations([conversation({ id: "other" })], null);
        const before = get().conversationsRevision;

        get().applyIncoming(incoming());

        expect(get().conversationsRevision).toBe(before + 1);
        expect(get().unreadCount).toBe(1);
    });
});

describe("the conversation list", () => {
    it("moves a thread to the front and rewrites its preview", () => {
        get().setConversations(
            [conversation({ id: "c0" }), conversation({ id: "c1" })],
            null,
        );

        get().applyIncoming(incoming());

        const [first, second] = get().conversations;
        expect(first.id).toBe("c1");
        expect(first.lastMessagePreview).toBe("newest");
        expect(first.lastMessageAt).toBe("2026-09-03T13:00:00.000Z");
        expect(second.id).toBe("c0");
    });

    it("records when the other participant last read", () => {
        get().setConversations([conversation()], null);
        get().setThread(conversation(), [message()], null);

        get().applyRead({
            conversationId: "c1",
            senderId: "u2",
            readAt: "2026-09-03T13:30:00.000Z",
        });

        expect(get().conversations[0].otherLastReadAt).toBe(
            "2026-09-03T13:30:00.000Z",
        );
        expect(get().activeConversation?.otherLastReadAt).toBe(
            "2026-09-03T13:30:00.000Z",
        );
    });

    it("zeroes a row on read without guessing at the global count", () => {
        get().setConversations([conversation({ unreadCount: 4 })], null);
        get().setUnreadCount(9);

        get().markConversationRead("c1");

        expect(get().conversations[0].unreadCount).toBe(0);
        // Subtracting here would be wrong for a thread reached from a profile,
        // which was never in a loaded page. The caller re-reads the server.
        expect(get().unreadCount).toBe(9);
    });
});

describe("message requests", () => {
    /*
     * The whole point of the separate event: a message that opens a request
     * must not raise the inbox badge, or an open inbox is a broadcast channel.
     */
    it("counts separately from the inbox badge", () => {
        get().applyRequest(incoming({ conversationId: "new" }));

        expect(get().requestCount).toBe(1);
        expect(get().unreadCount).toBe(0);
    });

    it("lets a fetch correct a count realtime raised blind", () => {
        get().applyRequest(incoming({ conversationId: "new" }));
        get().applyRequest(incoming({ conversationId: "newer" }));
        expect(get().requestCount).toBe(2);

        get().setRequests(
            [conversation({ id: "only", status: "PENDING" })],
            null,
        );

        expect(get().requestCount).toBe(1);
    });

    it("moves an accepted thread out of the requests and into the inbox", () => {
        get().setRequests(
            [conversation({ id: "c1", status: "PENDING", isRequest: true })],
            null,
        );

        get().upsertConversation(
            conversation({ id: "c1", status: "ACCEPTED", isRequest: false }),
        );

        expect(get().requests).toHaveLength(0);
        expect(get().requestCount).toBe(0);
        expect(get().conversations.map((c) => c.id)).toEqual(["c1"]);
    });

    it("drops a declined thread from both lists, because it is never listed again", () => {
        get().setRequests(
            [conversation({ id: "c1", status: "PENDING", isRequest: true })],
            null,
        );

        get().upsertConversation(
            conversation({ id: "c1", status: "DECLINED", canSend: false }),
        );

        expect(get().requests).toHaveLength(0);
        expect(get().conversations).toHaveLength(0);
    });
});

describe("messages in a thread", () => {
    it("appends an older page at the end, since the array runs newest first", () => {
        get().setThread(conversation(), [message({ id: "new" })], "cursor-1");

        get().setThread(conversation(), [message({ id: "old" })], null, true);

        expect(get().messages.map((m) => m.id)).toEqual(["new", "old"]);
        expect(get().messagesCursor).toBeNull();
    });

    it("swaps an optimistic bubble for the server copy", () => {
        get().addMessage(message({ id: "temp-1", isMine: true }));

        get().replaceMessage("temp-1", message({ id: "m5", isMine: true }));

        expect(get().messages.map((m) => m.id)).toEqual(["m5"]);
    });

    /*
     * A withdrawal empties the row and leaves it where it was. Removing it
     * would close a gap the other participant may have replied into.
     */
    it("keeps a withdrawn message in place as a tombstone", () => {
        get().setThread(
            conversation(),
            [message({ id: "m2" }), message({ id: "m1", content: "gone" })],
            null,
        );

        get().applyDeleted({
            conversationId: "c1",
            messageId: "m1",
            senderId: "u2",
        });

        expect(get().messages.map((m) => m.id)).toEqual(["m2", "m1"]);
        const tombstone = get().messages[1];
        expect(tombstone.isDeleted).toBe(true);
        expect(tombstone.content).toBe("");
        expect(tombstone.mediaUrls).toEqual([]);
    });

    it("turns a pending video into a rejection when moderation refuses it", () => {
        get().setThread(
            conversation(),
            [message({ id: "m1", mediaPending: true })],
            null,
        );

        get().applyMediaRejected({
            conversationId: "c1",
            messageId: "m1",
            senderId: "u1",
        });

        const [row] = get().messages;
        expect(row.mediaPending).toBe(false);
        expect(row.mediaRejected).toBe(true);
        expect(row.mediaUrls).toEqual([]);
    });

    it("clears the focus along with the thread on the way out", () => {
        get().setThread(conversation(), [message()], "cursor-1");
        get().setFocusedConversation("c1");

        get().clearThread();

        expect(get().messages).toEqual([]);
        expect(get().messagesCursor).toBeNull();
        expect(get().activeConversation).toBeNull();
        expect(get().focusedConversationId).toBeNull();
    });
});
