import { useCallback, useState } from "react";
import { messageApi } from "../api/message.api";
import { useMessageStore } from "../store/message.store";
import { useAuthStore } from "../../../core/auth/auth.store";
import { useToastStore } from "../../../shared/store/toast.store";
import { getErrorMessage } from "../../../shared/utils/error-handler";
import type { Message } from "../api/message.types";

/**
 * Marks a bubble that exists only on this device. The prefix is what tells
 * `replaceMessage` and the delete affordance apart from a real id — a message
 * the server has not acknowledged has nothing to withdraw.
 */
const TEMP_PREFIX = "temp-";

export const isPendingMessage = (id: string) => id.startsWith(TEMP_PREFIX);

/**
 * Sends a message, optimistically.
 *
 * The bubble appears immediately and is swapped for the server copy on
 * success. On failure it is removed and the error is toasted, because a
 * message that silently vanishes is indistinguishable from one that was sent —
 * and here the difference matters more than it does for a like.
 *
 * The write budget is five a minute, which an ordinary exchange reaches, so
 * the `429` is not an edge case — `getErrorMessage` translates that one by
 * title. Leaving the bubble on screen as though it were still on its way would
 * be worse than saying plainly that it did not go.
 */
export function useSendMessage(conversationId: string) {
    const addMessage = useMessageStore((s) => s.addMessage);
    const replaceMessage = useMessageStore((s) => s.replaceMessage);
    const removeMessage = useMessageStore((s) => s.removeMessage);
    const userId = useAuthStore((s) => s.user?.id);
    const addToast = useToastStore((s) => s.addToast);

    const [isSending, setIsSending] = useState(false);

    const send = useCallback(
        async (content: string, mediaUrls: string[] = []): Promise<boolean> => {
            const tempId = `${TEMP_PREFIX}${Date.now()}`;
            const optimistic: Message = {
                id: tempId,
                conversationId,
                senderId: userId ?? "",
                content,
                mediaUrls,
                isSensitive: false,
                // The server decides both, and says so in its reply. Guessing
                // `true` here would put a "being checked" placeholder under
                // every photo, which clears within the same second.
                mediaPending: false,
                mediaRejected: false,
                isDeleted: false,
                isMine: true,
                createdAt: new Date().toISOString(),
            };

            addMessage(optimistic);
            setIsSending(true);

            try {
                const sent = await messageApi.sendMessage(
                    conversationId,
                    content,
                    mediaUrls,
                );
                replaceMessage(tempId, sent);
                return true;
            } catch (err) {
                removeMessage(tempId);
                addToast({ type: "error", message: getErrorMessage(err) });
                return false;
            } finally {
                setIsSending(false);
            }
        },
        [
            conversationId,
            userId,
            addMessage,
            replaceMessage,
            removeMessage,
            addToast,
        ],
    );

    return { send, isSending };
}
