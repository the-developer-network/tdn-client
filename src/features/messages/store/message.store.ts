import { create } from "zustand";
import type {
    Conversation,
    IncomingMessagePayload,
    MediaRejectedPayload,
    Message,
    MessageDeletedPayload,
    MessageReadPayload,
} from "../api/message.types";

export interface MessageState {
    /** `ACCEPTED` threads, newest activity first. */
    conversations: Conversation[];
    conversationsCursor: string | null;
    /** `PENDING` threads — the request tab. */
    requests: Conversation[];
    requestsCursor: string | null;
    /**
     * How many requests are waiting. Derived from the length of the listing
     * because the API offers no count for it: `/conversations/unread-count`
     * covers `ACCEPTED` only, deliberately, so an unanswered request cannot
     * raise the inbox badge. That caps this at the page size, which the badge
     * hides — anything past 9 renders as "9+".
     */
    requestCount: number;
    /**
     * Unread messages across `ACCEPTED` conversations. **The list never
     * defines this**, exactly as in `notification.store.ts`: counting the
     * loaded rows would cap the badge at the page size, and recounting after
     * an appended page would wipe every realtime increment. The server
     * answers it directly.
     */
    unreadCount: number;

    /**
     * The thread the reader is looking at *right now* — cleared when the tab
     * is hidden, not only when the page unmounts. A message arriving for it is
     * read on arrival, so it must not raise the badge; a message arriving for
     * a thread left open behind a hidden tab has been read by nobody and must.
     */
    focusedConversationId: string | null;
    activeConversation: Conversation | null;
    /** Newest first, as the API returns them. */
    messages: Message[];
    messagesCursor: string | null;

    /**
     * Bumped when realtime learned something the store cannot represent on its
     * own, and a mounted view should re-read from the server.
     *
     * The socket payload carries a `preview`, not a `content` — thin in
     * exactly the way `notification.store.ts` describes. That is enough to
     * update a list row (preview, timestamp, order) and nowhere near enough to
     * become a `Message` bubble. Rather than inventing the missing half, the
     * store says "you are behind" and the hook that owns the request re-reads.
     * Keeping the fetch out here is what leaves every reducer below a pure
     * function the tests can drive through `getState()`.
     */
    threadRevision: number;
    conversationsRevision: number;
    requestsRevision: number;

    setConversations: (
        list: Conversation[],
        cursor: string | null,
        append?: boolean,
    ) => void;
    setRequests: (
        list: Conversation[],
        cursor: string | null,
        append?: boolean,
    ) => void;
    setUnreadCount: (count: number) => void;
    setFocusedConversation: (id: string | null) => void;
    setThread: (
        conversation: Conversation,
        messages: Message[],
        cursor: string | null,
        append?: boolean,
    ) => void;
    clearThread: () => void;
    addMessage: (message: Message) => void;
    replaceMessage: (tempId: string, message: Message) => void;
    removeMessage: (id: string) => void;
    markMessageDeleted: (id: string) => void;
    markConversationRead: (id: string) => void;
    upsertConversation: (conversation: Conversation) => void;

    applyIncoming: (payload: IncomingMessagePayload) => void;
    applyRequest: (payload: IncomingMessagePayload) => void;
    applyRead: (payload: MessageReadPayload) => void;
    applyDeleted: (payload: MessageDeletedPayload) => void;
    applyMediaRejected: (payload: MediaRejectedPayload) => void;
}

/**
 * Moves a conversation to the front and rewrites its preview from a realtime
 * payload. The list is ordered by last activity, so an arriving message
 * reorders it — which is also why the API offers no page numbers.
 */
function bumpRow(
    rows: Conversation[],
    payload: IncomingMessagePayload,
    countsAsUnread: boolean,
): { rows: Conversation[]; found: boolean } {
    const index = rows.findIndex((c) => c.id === payload.conversationId);
    if (index === -1) return { rows, found: false };

    const row = rows[index];
    const updated: Conversation = {
        ...row,
        lastMessagePreview: payload.preview,
        lastMessageAt: payload.createdAt,
        unreadCount: countsAsUnread ? row.unreadCount + 1 : row.unreadCount,
    };

    return {
        rows: [updated, ...rows.slice(0, index), ...rows.slice(index + 1)],
        found: true,
    };
}

function patchMessage(
    messages: Message[],
    id: string,
    patch: Partial<Message>,
): Message[] {
    return messages.map((m) => (m.id === id ? { ...m, ...patch } : m));
}

/** What a withdrawal leaves behind: the row, and nothing in it. */
const TOMBSTONE: Partial<Message> = {
    isDeleted: true,
    content: "",
    mediaUrls: [],
    mediaPending: false,
};

export const useMessageStore = create<MessageState>((set) => ({
    conversations: [],
    conversationsCursor: null,
    requests: [],
    requestsCursor: null,
    requestCount: 0,
    unreadCount: 0,
    focusedConversationId: null,
    activeConversation: null,
    messages: [],
    messagesCursor: null,
    threadRevision: 0,
    conversationsRevision: 0,
    requestsRevision: 0,

    setConversations: (list, cursor, append = false) =>
        set((state) => ({
            conversations: append ? [...state.conversations, ...list] : list,
            conversationsCursor: cursor,
        })),

    /**
     * The first page settles `requestCount`; an appended page adds to it. The
     * server is the authority either way, which is what corrects a count
     * realtime raised blind — a `conversation:request` arriving while no
     * request tab was mounted increments without a row to attach it to.
     */
    setRequests: (list, cursor, append = false) =>
        set((state) => ({
            requests: append ? [...state.requests, ...list] : list,
            requestsCursor: cursor,
            requestCount: append
                ? state.requests.length + list.length
                : list.length,
        })),

    /** Authoritative: what the server last said the count was. */
    setUnreadCount: (count) => set({ unreadCount: count }),

    setFocusedConversation: (id) => set({ focusedConversationId: id }),

    setThread: (conversation, messages, cursor, append = false) =>
        set((state) => ({
            activeConversation: conversation,
            // Older pages arrive after the newest ones and the array runs
            // newest first, so an appended page belongs at the end.
            messages: append ? [...state.messages, ...messages] : messages,
            messagesCursor: cursor,
        })),

    clearThread: () =>
        set({
            activeConversation: null,
            messages: [],
            messagesCursor: null,
            focusedConversationId: null,
        }),

    addMessage: (message) =>
        set((state) => ({ messages: [message, ...state.messages] })),

    replaceMessage: (tempId, message) =>
        set((state) => ({
            messages: state.messages.map((m) =>
                m.id === tempId ? message : m,
            ),
        })),

    removeMessage: (id) =>
        set((state) => ({
            messages: state.messages.filter((m) => m.id !== id),
        })),

    /**
     * A withdrawal empties the row without removing it. Dropping it outright
     * would close a gap the other participant may have replied into, leaving
     * their reply answering nothing.
     */
    markMessageDeleted: (id) =>
        set((state) => ({
            messages: patchMessage(state.messages, id, TOMBSTONE),
        })),

    /**
     * Zeroes the row for immediate feedback. The global count is deliberately
     * *not* adjusted here — the caller re-reads it from the server, because a
     * row that was never loaded has no `unreadCount` to subtract and guessing
     * one leaves the badge permanently wrong in a direction nothing corrects.
     */
    markConversationRead: (id) =>
        set((state) => ({
            conversations: state.conversations.map((c) =>
                c.id === id ? { ...c, unreadCount: 0 } : c,
            ),
            activeConversation:
                state.activeConversation?.id === id
                    ? { ...state.activeConversation, unreadCount: 0 }
                    : state.activeConversation,
        })),

    /**
     * After an accept, a decline or an open. A thread that just left `PENDING`
     * has to leave the request tab as well as join the inbox, or it shows in
     * both until the next fetch. A `DECLINED` one leaves both lists: it is
     * terminal and is never listed again.
     */
    upsertConversation: (conversation) =>
        set((state) => {
            const conversations = state.conversations.filter(
                (c) => c.id !== conversation.id,
            );
            const requests = state.requests.filter(
                (c) => c.id !== conversation.id,
            );
            const isAccepted = conversation.status === "ACCEPTED";
            const isPending = conversation.status === "PENDING";

            return {
                conversations: isAccepted
                    ? [conversation, ...conversations]
                    : conversations,
                requests: isPending ? [conversation, ...requests] : requests,
                requestCount: isPending ? requests.length + 1 : requests.length,
                activeConversation:
                    state.activeConversation?.id === conversation.id
                        ? conversation
                        : state.activeConversation,
            };
        }),

    applyIncoming: (payload) =>
        set((state) => {
            const isFocused =
                state.focusedConversationId === payload.conversationId;
            const { rows, found } = bumpRow(
                state.conversations,
                payload,
                !isFocused,
            );

            return {
                conversations: rows,
                // A thread the reader is looking at is read as it arrives, so
                // raising the badge for it would leave a number the reader can
                // only clear by navigating away and coming back.
                unreadCount: isFocused
                    ? state.unreadCount
                    : state.unreadCount + 1,
                // The bubble cannot be built from `preview`, so the open thread
                // re-reads its newest page instead.
                threadRevision: isFocused
                    ? state.threadRevision + 1
                    : state.threadRevision,
                // A message for a thread that is not in the loaded page leaves
                // nothing to reorder, so the list re-reads rather than growing
                // a row out of a payload that is not one.
                conversationsRevision: found
                    ? state.conversationsRevision
                    : state.conversationsRevision + 1,
            };
        }),

    /**
     * A message request. Distinct from `message:new` on purpose: it must not
     * raise the inbox badge, or an open inbox becomes a broadcast channel with
     * a notification attached to it.
     */
    applyRequest: (payload) =>
        set((state) => {
            const { rows, found } = bumpRow(state.requests, payload, true);
            return {
                requests: rows,
                requestCount: found
                    ? state.requestCount
                    : state.requestCount + 1,
                requestsRevision: found
                    ? state.requestsRevision
                    : state.requestsRevision + 1,
            };
        }),

    /**
     * The other participant opened the thread. Read state is per conversation,
     * so this is one watermark rather than a receipt per message: a sent
     * message counts as seen when its `createdAt` precedes `readAt`.
     */
    applyRead: (payload) =>
        set((state) => ({
            conversations: state.conversations.map((c) =>
                c.id === payload.conversationId
                    ? { ...c, otherLastReadAt: payload.readAt }
                    : c,
            ),
            activeConversation:
                state.activeConversation?.id === payload.conversationId
                    ? {
                          ...state.activeConversation,
                          otherLastReadAt: payload.readAt,
                      }
                    : state.activeConversation,
        })),

    applyDeleted: (payload) =>
        set((state) => ({
            messages: patchMessage(
                state.messages,
                payload.messageId,
                TOMBSTONE,
            ),
        })),

    /**
     * Delivered to the sender only. The recipient read path withholds
     * unscanned media, so from their side the file never existed and there is
     * nothing to withdraw.
     */
    applyMediaRejected: (payload) =>
        set((state) => ({
            messages: patchMessage(state.messages, payload.messageId, {
                mediaPending: false,
                mediaRejected: true,
                mediaUrls: [],
            }),
        })),
}));
