import { useState } from "react";
import { Button } from "../../../shared/components/ui/Button";
import { Modal } from "../../../shared/components/ui/Modal";
import { useI18n } from "../../../shared/hooks/useI18n";
import { useConversationActions } from "../hooks/useConversationActions";
import type { Conversation } from "../api/message.types";

interface RequestActionsProps {
    conversation: Conversation;
}

/**
 * The accept/decline bar at the top of a message request.
 *
 * Shown from `isRequest` rather than from `status === "PENDING"`, because the
 * two are different questions: the *initiator* of a pending conversation may
 * already write to it and has nothing to decide. The server resolves the
 * distinction per reader and the client reads its answer.
 *
 * Declining is confirmed because it is terminal — a later attempt to open the
 * same pair returns the declined thread unchanged, so there is no undo to
 * offer afterwards.
 */
export function RequestActions({ conversation }: RequestActionsProps) {
    const { t } = useI18n();
    const { accept, decline, isBusy } = useConversationActions();
    const [isConfirming, setIsConfirming] = useState(false);

    const name =
        conversation.participant.fullName || conversation.participant.username;

    return (
        <div className="border-b border-ink/10 bg-surface-1 px-4 py-3">
            <p className="text-sm text-ink/70">
                {t("messages.requestNotice", { name })}
            </p>
            <div className="mt-3 flex gap-2">
                <Button
                    size="sm"
                    disabled={isBusy}
                    onClick={() => void accept(conversation.id)}
                >
                    {t("messages.accept")}
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => setIsConfirming(true)}
                >
                    {t("messages.decline")}
                </Button>
            </div>

            <Modal isOpen={isConfirming} onClose={() => setIsConfirming(false)}>
                <div className="p-6 pt-14">
                    <h2 className="text-lg font-bold text-ink">
                        {t("messages.declineConfirm")}
                    </h2>
                    <p className="mt-2 text-sm text-ink/60">
                        {t("messages.declineConfirmBody")}
                    </p>
                    <div className="mt-6 flex justify-end gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setIsConfirming(false)}
                        >
                            {t("messages.cancel")}
                        </Button>
                        <Button
                            size="sm"
                            className="bg-red-500 text-on-fill hover:bg-red-400"
                            onClick={() => {
                                setIsConfirming(false);
                                void decline(conversation.id);
                            }}
                        >
                            {t("messages.decline")}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
