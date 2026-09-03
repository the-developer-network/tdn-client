import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { messageApi } from "../api/message.api";
import { useMessageStore } from "../store/message.store";
import { useAuthStore } from "../../../core/auth/auth.store";
import { useAuthModalStore } from "../../auth/store/auth-modal.store";
import { useToastStore } from "../../../shared/store/toast.store";
import { getErrorMessage } from "../../../shared/utils/error-handler";

/**
 * Opens the thread with someone and goes to it.
 *
 * "Open", not "create": the conversation is identified by the pair, so this is
 * idempotent and the same two accounts always land on the same thread. Whether
 * it arrives `ACCEPTED` or as a request depends on whether the recipient
 * follows the caller, and that is the server to decide — the client reads
 * `isRequest` and `canSend` off the answer rather than working it out.
 *
 * A pair whose conversation was declined comes back unchanged, with
 * `canSend: false`. Navigating there anyway is deliberate: the thread and its
 * history still exist, and a dead end that shows why is easier to understand
 * than a button that appears to do nothing.
 */
export function useOpenConversation() {
    const navigate = useNavigate();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const openModal = useAuthModalStore((s) => s.openModal);
    const upsertConversation = useMessageStore((s) => s.upsertConversation);
    const addToast = useToastStore((s) => s.addToast);
    const [isOpening, setIsOpening] = useState(false);

    const open = useCallback(
        async (recipientId: string) => {
            if (!isAuthenticated) {
                openModal();
                return;
            }

            /*
             * Never send the request without one. `JSON.stringify` drops a key
             * whose value is `undefined`, so a caller passing one that is not
             * there produces `{}` — and the server can only answer that
             * `recipientId` is missing, which reads as a client bug in the
             * message body rather than as a profile that never had an id.
             * That is exactly how this shipped, so it is caught here as well
             * as at the call site.
             */
            if (!recipientId) return;

            setIsOpening(true);
            try {
                const conversation =
                    await messageApi.openConversation(recipientId);
                upsertConversation(conversation);
                navigate(`/messages/${conversation.id}`);
            } catch (err) {
                // `InvalidRecipientError` covers three cases with one status —
                // yourself, a bot, an account pending deletion — and the
                // server writes which. Nothing here can improve on that.
                addToast({ type: "error", message: getErrorMessage(err) });
            } finally {
                setIsOpening(false);
            }
        },
        [isAuthenticated, openModal, upsertConversation, navigate, addToast],
    );

    return { open, isOpening };
}
