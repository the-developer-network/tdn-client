import { useCallback, useState } from "react";
import { blockApi } from "../api/block.api";
import { useAuthStore } from "../../../core/auth/auth.store";
import { useAuthModalStore } from "../../auth/store/auth-modal.store";
import { useToastStore } from "../../../shared/store/toast.store";
import { getErrorMessage } from "../../../shared/utils/error-handler";

/**
 * Blocking and unblocking, for the profile header and the settings list.
 *
 * Deliberately **not** optimistic, unlike every other mutation in the app. A
 * like flips one icon and a failed one flips it back; a block hides an account
 * from a reader who then goes on believing it worked, and the reader has no
 * way of telling the difference — the timeline is empty either way. So the
 * request is awaited and the caller is handed the outcome, and a failure is
 * toasted rather than rolled back silently the way `useFollowAction` can
 * afford to.
 *
 * `pendingId` rather than a bare boolean: the settings list renders a row per
 * blocked account, and one shared flag would disable all of them at once.
 */
export function useBlockAction() {
    const [pendingId, setPendingId] = useState<string | null>(null);

    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const openModal = useAuthModalStore((state) => state.openModal);
    const addToast = useToastStore((state) => state.addToast);

    const run = useCallback(
        async (
            targetId: string,
            action: (id: string) => Promise<unknown>,
        ): Promise<boolean> => {
            if (!isAuthenticated) {
                openModal();
                return false;
            }
            /*
             * An empty id is not dropped from the body the way `undefined` is
             * — it reaches the server as `{ targetId: "" }`, fails validation,
             * and surfaces as a toast about a request the user did not make.
             * Warned rather than swallowed, as in `useFollowAction`.
             */
            if (!targetId) {
                console.warn("Block skipped — no target id was given.");
                return false;
            }
            if (pendingId) return false;

            setPendingId(targetId);
            try {
                await action(targetId);
                return true;
            } catch (err) {
                addToast({ type: "error", message: getErrorMessage(err) });
                return false;
            } finally {
                setPendingId(null);
            }
        },
        [isAuthenticated, openModal, addToast, pendingId],
    );

    const block = useCallback(
        (targetId: string) => run(targetId, blockApi.block),
        [run],
    );

    const unblock = useCallback(
        (targetId: string) => run(targetId, blockApi.unblock),
        [run],
    );

    return { block, unblock, pendingId, isPending: pendingId !== null };
}
