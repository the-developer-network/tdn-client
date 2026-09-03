import { useCallback, useState } from "react";
import { messageApi } from "../api/message.api";
import { useMessageStore } from "../store/message.store";
import { useToastStore } from "../../../shared/store/toast.store";
import { getErrorMessage } from "../../../shared/utils/error-handler";

/**
 * Accepting, declining and withdrawing — the three writes that change a thread
 * rather than adding to it.
 *
 * None of them is optimistic, and that is the difference from a like. Accept
 * and decline both answer with the conversation, so guessing the new shape
 * only to overwrite it a moment later would buy nothing; decline is terminal,
 * so a rollback would be showing a thread that can never come back. A
 * withdrawal *is* applied straight away — the row stays either way, and the
 * sender watching their own message needs to see it go.
 */
export function useConversationActions() {
    const upsertConversation = useMessageStore((s) => s.upsertConversation);
    const markMessageDeleted = useMessageStore((s) => s.markMessageDeleted);
    const addToast = useToastStore((s) => s.addToast);
    const [isBusy, setIsBusy] = useState(false);

    const accept = useCallback(
        async (conversationId: string) => {
            setIsBusy(true);
            try {
                upsertConversation(
                    await messageApi.acceptConversation(conversationId),
                );
            } catch (err) {
                addToast({ type: "error", message: getErrorMessage(err) });
            } finally {
                setIsBusy(false);
            }
        },
        [upsertConversation, addToast],
    );

    const decline = useCallback(
        async (conversationId: string) => {
            setIsBusy(true);
            try {
                upsertConversation(
                    await messageApi.declineConversation(conversationId),
                );
            } catch (err) {
                addToast({ type: "error", message: getErrorMessage(err) });
            } finally {
                setIsBusy(false);
            }
        },
        [upsertConversation, addToast],
    );

    const remove = useCallback(
        async (messageId: string) => {
            try {
                await messageApi.deleteMessage(messageId);
                markMessageDeleted(messageId);
            } catch (err) {
                addToast({ type: "error", message: getErrorMessage(err) });
            }
        },
        [markMessageDeleted, addToast],
    );

    return { accept, decline, remove, isBusy };
}
