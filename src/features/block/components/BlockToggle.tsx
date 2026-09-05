import { useState } from "react";
import { Ban } from "lucide-react";
import { Modal } from "../../../shared/components/ui/Modal";
import { Button } from "../../../shared/components/ui/Button";
import { useBlockAction } from "../hooks/useBlockAction";
import { useToastStore } from "../../../shared/store/toast.store";
import { useI18n } from "../../../shared/hooks/useI18n";

interface BlockToggleProps {
    targetId: string;
    username: string;
    isBlocked: boolean;
    /**
     * Called once the server has answered, never before. The caller re-reads
     * the profile rather than being handed a patched copy: a block also tears
     * down both follows and zeroes the counts, and guessing all of that from
     * here is how two parts of the same header come to disagree.
     */
    onChange: () => void;
}

/**
 * The block control on a profile header.
 *
 * Asymmetric on purpose. **Blocking asks first** — it hides an account from
 * you and you from it, and drops both follows on the way in, none of which the
 * screen afterwards can show you undoing. **Unblocking does not** — it is the
 * reversible direction, and a confirmation on the way out of a state the user
 * chose to leave is a dialog nobody reads.
 *
 * There is no dropdown here because there is no dropdown anywhere in this app;
 * a destructive action behind an icon and a confirm modal is the shape
 * `PostCard` already uses for deletion.
 */
export function BlockToggle({
    targetId,
    username,
    isBlocked,
    onChange,
}: BlockToggleProps) {
    const { t } = useI18n();
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const { block, unblock, isPending } = useBlockAction();
    const addToast = useToastStore((state) => state.addToast);

    async function handleBlock() {
        const blocked = await block(targetId);
        if (!blocked) return;
        setIsConfirmOpen(false);
        addToast({
            type: "success",
            message: t("block.blockedToast", { username }),
        });
        onChange();
    }

    async function handleUnblock() {
        const lifted = await unblock(targetId);
        if (!lifted) return;
        addToast({ type: "success", message: t("block.unblockedToast") });
        onChange();
    }

    if (isBlocked) {
        return (
            <button
                onClick={() => void handleUnblock()}
                disabled={isPending || !targetId}
                className="rounded-full border border-ink/20 px-5 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-ink/5 disabled:opacity-60"
            >
                {isPending ? t("block.working") : t("block.unblock")}
            </button>
        );
    }

    return (
        <>
            <button
                onClick={() => setIsConfirmOpen(true)}
                disabled={isPending || !targetId}
                aria-label={t("block.action")}
                title={t("block.action")}
                className="rounded-full border border-ink/20 p-2 text-ink/50 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-60"
            >
                <Ban size={16} aria-hidden="true" />
            </button>

            <Modal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
            >
                <div className="p-6">
                    <h3 className="mb-2 text-lg font-bold text-ink">
                        {t("block.confirmTitle", { username })}
                    </h3>
                    <p className="mb-3 text-sm text-ink/60">
                        {t("block.confirmBody")}
                    </p>
                    <p className="text-sm text-ink/40">
                        {t("block.confirmFollowNote")}
                    </p>
                    <div className="mt-5 flex gap-3">
                        <Button
                            variant="secondary"
                            size="md"
                            onClick={() => setIsConfirmOpen(false)}
                        >
                            {t("common.cancel")}
                        </Button>
                        <button
                            onClick={() => void handleBlock()}
                            disabled={isPending}
                            className="flex-1 rounded-full bg-red-600 px-4 py-2.5 text-sm font-bold text-on-fill transition-colors hover:bg-red-700 disabled:opacity-50"
                        >
                            {isPending ? t("block.working") : t("block.action")}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
