import { useEffect } from "react";
import { useAuthStore } from "../../../core/auth/auth.store";
import { messageApi } from "../api/message.api";
import { useMessageStore } from "../store/message.store";

/**
 * Seeds the inbox badge at boot, and clears it on sign-out.
 *
 * Only the count, not the list: the inbox is a page someone visits, and
 * fetching twenty conversations on every cold start to render a number the
 * server already knows is the mistake `useInitialUnreadCount` was built to
 * undo. The listing loads when the page does.
 *
 * The request-tab badge is deliberately absent here. It has no endpoint —
 * `/conversations/unread-count` covers `ACCEPTED` only, so that an unanswered
 * request cannot raise the inbox badge — and it is derived from the `PENDING`
 * listing once that page is opened.
 *
 * Best-effort and silent: nothing on a cold start is worth a toast.
 */
export function useInitialUnreadMessages() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const setUnreadCount = useMessageStore((state) => state.setUnreadCount);

    useEffect(() => {
        if (!isAuthenticated) {
            // Explicit, or the previous account badge survives a sign-out.
            setUnreadCount(0);
            return;
        }

        // A response landing after a sign-out would otherwise repopulate what
        // the branch above just cleared.
        let cancelled = false;

        messageApi
            .getUnreadCount()
            .then((count) => {
                if (!cancelled) setUnreadCount(count);
            })
            .catch(() => {
                // The badge stays at its last known value.
            });

        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, setUnreadCount]);
}
