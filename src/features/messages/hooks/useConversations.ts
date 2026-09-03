import { useCallback, useEffect, useState } from "react";
import { messageApi } from "../api/message.api";
import { useMessageStore } from "../store/message.store";
import { getErrorMessage } from "../../../shared/utils/error-handler";
import type { ConversationListStatus } from "../api/message.types";

const PAGE_LIMIT = 20;

/**
 * One tab of the inbox: `ACCEPTED` for conversations, `PENDING` for requests.
 *
 * Cursor-paginated rather than numbered, and that is not a style choice — the
 * list reorders every time a message arrives, so page 2 of a numbered listing
 * would skip and repeat rows as people write to each other. `nextCursor` is
 * opaque and is handed straight back; `null` is the end.
 */
export function useConversations(status: ConversationListStatus) {
    const isRequests = status === "PENDING";

    const setConversations = useMessageStore((s) => s.setConversations);
    const setRequests = useMessageStore((s) => s.setRequests);
    const cursor = useMessageStore((s) =>
        isRequests ? s.requestsCursor : s.conversationsCursor,
    );
    const revision = useMessageStore((s) =>
        isRequests ? s.requestsRevision : s.conversationsRevision,
    );

    // The first page is always on its way, so this starts true rather than
    // being switched on from inside the effect that starts it.
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const store = isRequests ? setRequests : setConversations;

    /**
     * Every state write here happens after the request has settled. That keeps
     * it callable straight from an effect: nothing is set synchronously, so
     * mounting the list does not cascade a second render before the first has
     * painted.
     */
    const loadPage = useCallback(
        async (nextCursor: string | null, append: boolean) => {
            try {
                const page = await messageApi.getConversations(status, {
                    limit: PAGE_LIMIT,
                    cursor: nextCursor,
                });
                store(page.data, page.meta?.nextCursor ?? null, append);
                setError(null);
            } catch (err) {
                setError(getErrorMessage(err));
            }
        },
        [status, store],
    );

    /** The retry button. An event handler, so the skeleton may come back. */
    const fetch = useCallback(async () => {
        setIsLoading(true);
        await loadPage(null, false);
        setIsLoading(false);
    }, [loadPage]);

    const loadMore = useCallback(async () => {
        // Read at call time rather than closed over, so this keeps one
        // identity across pages. No cursor means the end of the listing, not a
        // first page — passing `null` would silently restart from the top and
        // duplicate every row already on screen.
        const state = useMessageStore.getState();
        const next = isRequests
            ? state.requestsCursor
            : state.conversationsCursor;
        if (isLoadingMore || !next) return;

        setIsLoadingMore(true);
        await loadPage(next, true);
        setIsLoadingMore(false);
    }, [isRequests, isLoadingMore, loadPage]);

    /** The mount load, and the reload realtime asks for. */
    const loadFirstPage = useCallback(async () => {
        await loadPage(null, false);
        setIsLoading(false);
    }, [loadPage]);

    // Reloads when realtime saw a conversation this page does not hold. The
    // socket payload is a preview, not a row, so there is nothing to insert —
    // only a reason to ask again.
    //
    // `set-state-in-effect` reads `loadFirstPage` as a synchronous write. It is
    // not one: every state change in it happens after an awaited request, in a
    // promise continuation a full round trip later, which is the "setState from
    // a callback" the rule exists to steer towards. The linter cannot see past
    // the async boundary, and the alternative — hiding the write two call
    // levels deep until it stops being noticed — would be the same code with
    // worse structure.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadFirstPage();
    }, [loadFirstPage, revision]);

    return {
        fetch,
        isLoading,
        isLoadingMore,
        error,
        hasMore: cursor !== null,
        loadMore,
    };
}
