import { api } from "../../../core/api/client";
import { withModerationRetry } from "../../../shared/utils/media-errors";
import type { ApiResponse, CursorMeta } from "../../../core/api/api-types";
import type {
    Conversation,
    ConversationListStatus,
    Message,
    ThreadPage,
} from "./message.types";

interface CursorParams {
    limit?: number;
    cursor?: string | null;
}

/**
 * `cursor` is opaque — echoed back exactly as the server wrote it, never
 * parsed or built. It is omitted rather than sent empty on a first page: an
 * undecodable cursor is answered with the first page anyway, but sending one
 * the client invented is how that stops being true.
 */
function pageQuery(params: CursorParams, defaultLimit: number): string {
    const query = new URLSearchParams();
    query.set("limit", String(params.limit ?? defaultLimit));
    if (params.cursor) query.set("cursor", params.cursor);
    return query.toString();
}

/**
 * Direct messaging. Nothing here is `isPublic`: there is no unauthenticated
 * read path, so a 401 means the session is stale and belongs to the refresh,
 * never to an anonymous replay.
 */
export const messageApi = {
    /**
     * `ACCEPTED` backs the inbox, `PENDING` the request tab. `DECLINED` is
     * never listed, which is why the parameter cannot name it.
     */
    getConversations: (
        status: ConversationListStatus,
        params: CursorParams = {},
    ): Promise<ApiResponse<Conversation[], CursorMeta>> =>
        api.getPage<Conversation[]>(
            `/conversations?status=${status}&${pageQuery(params, 20)}`,
        ),

    /**
     * Idempotent: the same two accounts always resolve to the same thread, so
     * this is "open", not "create". A `200` may describe a thread that has
     * existed for weeks — possibly a declined one, which comes back unchanged
     * with `canSend: false`. The client reads that field rather than the
     * status code, which `apiClient` does not surface.
     */
    openConversation: (recipientId: string): Promise<Conversation> =>
        api.post<Conversation>("/conversations", { recipientId }),

    /** Across `ACCEPTED` conversations only — requests never raise the badge. */
    getUnreadCount: (): Promise<number> =>
        api
            .get<{ count: number }>("/conversations/unread-count")
            .then((data) => data.count),

    /**
     * Newest first; paging walks backwards through history. The first page
     * carries the conversation, so opening a thread costs one request.
     */
    getThread: (
        conversationId: string,
        params: CursorParams = {},
    ): Promise<ApiResponse<ThreadPage, CursorMeta>> =>
        api.getPage<ThreadPage>(
            `/conversations/${conversationId}/messages?${pageQuery(params, 30)}`,
        ),

    /**
     * Both fields are optional to the server but not to each other — neither
     * text nor media is `400 EmptyMessageError`. The composer disables its
     * send button on that state rather than letting the request go.
     */
    sendMessage: (
        conversationId: string,
        content: string,
        mediaUrls: string[] = [],
    ): Promise<Message> =>
        api.post<Message>(`/conversations/${conversationId}/messages`, {
            content,
            mediaUrls,
        }),

    markRead: (conversationId: string): Promise<void> =>
        api.patch<void>(`/conversations/${conversationId}/read`, {}),

    acceptConversation: (conversationId: string): Promise<Conversation> =>
        api.patch<Conversation>(`/conversations/${conversationId}/accept`, {}),

    /** Terminal. There is no reopen, which is why the UI confirms first. */
    declineConversation: (conversationId: string): Promise<Conversation> =>
        api.patch<Conversation>(`/conversations/${conversationId}/decline`, {}),

    /**
     * A separate upload channel from `POST /media`, and the channel is fixed
     * when the bytes arrive: a file uploaded here cannot be attached to a
     * post, and a post's upload cannot be attached to a message. Crossing them
     * is `400 MediaNotOwnedError`.
     *
     * Wrapped in the one-shot 503 retry for the same reason every other upload
     * is — a moderation provider that blinks is worth absorbing, an outage is
     * not worth hiding.
     */
    uploadMedia: (files: File[]): Promise<{ mediaUrls: string[] }> =>
        withModerationRetry(() => {
            const formData = new FormData();
            files.forEach((file) => formData.append("files", file));

            return api.post<{ mediaUrls: string[] }>(
                "/messages/media",
                formData,
                { contentType: false },
            );
        }),

    /** Only the sender may withdraw, and the row survives as a tombstone. */
    deleteMessage: (messageId: string): Promise<void> =>
        api.delete(`/messages/${messageId}`, { contentType: false }),
};
