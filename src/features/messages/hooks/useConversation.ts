import { useCallback, useEffect, useRef, useState } from "react";
import { messageApi } from "../api/message.api";
import { useMessageStore } from "../store/message.store";
import { getErrorMessage } from "../../../shared/utils/error-handler";
import type { ApiErrorResponse } from "../../../core/api/api-types";

const PAGE_LIMIT = 30;

/**
 * How often to ask whether a video has been cleared, and when to give up.
 *
 * The same numbers the feed uses, for the same reason: the worker runs about
 * once a minute, so anything shorter asks a question whose answer cannot have
 * changed, and a video unjudged after five minutes is not about to be.
 */
const POLL_INTERVAL_MS = 20_000;
const POLL_LIMIT_MS = 5 * 60_000;

function isNotFound(err: unknown): boolean {
    return (
        !!err &&
        typeof err === "object" &&
        (err as Partial<ApiErrorResponse>).status === 404
    );
}

/**
 * One thread: its messages, its cursor, and the read watermark.
 *
 * The first page carries the conversation itself, so opening a thread is a
 * single request rather than a listing plus a lookup — which is why this hook
 * owns `activeConversation` as well as `messages`.
 *
 * A conversation the reader does not participate in answers `404`, not `403`,
 * so that thread membership cannot be probed. It is surfaced as "no such
 * conversation" for the same reason: telling the two apart in the UI would
 * hand back exactly the fact the status code is withholding.
 */
export function useConversation(conversationId: string) {
    const setThread = useMessageStore((s) => s.setThread);
    const clearThread = useMessageStore((s) => s.clearThread);
    const setFocused = useMessageStore((s) => s.setFocusedConversation);
    const markConversationRead = useMessageStore((s) => s.markConversationRead);
    const setUnreadCount = useMessageStore((s) => s.setUnreadCount);
    const cursor = useMessageStore((s) => s.messagesCursor);
    const threadRevision = useMessageStore((s) => s.threadRevision);
    const hasPendingMedia = useMessageStore((s) =>
        s.messages.some((m) => m.mediaPending),
    );

    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingOlder, setIsLoadingOlder] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notFound, setNotFound] = useState(false);

    /**
     * Clears the reader unread count and moves their watermark, then re-reads
     * the badge from the server rather than subtracting locally.
     *
     * Subtracting would need this row to be loaded in the inbox listing, and
     * it usually is not — a thread reached from a profile or a notification
     * was never in a page. A wrong guess there is permanent, because nothing
     * else recomputes the badge.
     *
     * Reading a `PENDING` conversation emits no event, so opening a request
     * does not signal receipt to whoever sent it.
     */
    const markRead = useCallback(async () => {
        try {
            await messageApi.markRead(conversationId);
            markConversationRead(conversationId);
            setUnreadCount(await messageApi.getUnreadCount());
        } catch {
            // The badge is cosmetic and self-corrects on the next boot; a
            // toast here would interrupt reading over nothing.
        }
    }, [conversationId, markConversationRead, setUnreadCount]);

    /**
     * The newest page. Every state write happens after the request settles, so
     * this is safe to call straight from an effect — the loading flags belong
     * to the callers that know which kind of load it is.
     */
    const fetchHead = useCallback(async () => {
        try {
            const page = await messageApi.getThread(conversationId, {
                limit: PAGE_LIMIT,
            });
            setThread(
                page.data.conversation,
                page.data.messages,
                page.meta?.nextCursor ?? null,
            );
            setNotFound(false);
            setError(null);
        } catch (err) {
            if (isNotFound(err)) setNotFound(true);
            else setError(getErrorMessage(err));
        }
    }, [conversationId, setThread]);

    const refresh = useCallback(async () => {
        setIsRefreshing(true);
        await fetchHead();
        setIsRefreshing(false);
    }, [fetchHead]);

    const loadOlder = useCallback(async () => {
        // Read at call time so this keeps one identity as the cursor moves.
        const next = useMessageStore.getState().messagesCursor;
        if (isLoadingOlder || !next) return;

        setIsLoadingOlder(true);
        try {
            const page = await messageApi.getThread(conversationId, {
                limit: PAGE_LIMIT,
                cursor: next,
            });
            setThread(
                page.data.conversation,
                page.data.messages,
                page.meta?.nextCursor ?? null,
                true,
            );
            setError(null);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoadingOlder(false);
        }
    }, [conversationId, isLoadingOlder, setThread]);

    const openThread = useCallback(async () => {
        await fetchHead();
        setIsLoading(false);
        void markRead();
    }, [fetchHead, markRead]);

    // Open the thread, and put it away on the way out. Without the teardown
    // the previous thread stays on screen for as long as the next one takes to
    // arrive, which reads as the wrong conversation rather than as loading.
    //
    // See `useConversations` for why the rule is silenced here: `setIsLoading`
    // runs in a promise continuation after an awaited request, not on the
    // render that started it.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void openThread();
        return clearThread;
    }, [openThread, clearThread]);

    /**
     * "Focused" means the reader is looking at this thread now — not merely
     * that the page is mounted. A message arriving into a visible thread is
     * read on arrival and must not raise the badge; the same message arriving
     * behind a hidden tab has been read by nobody and must.
     */
    useEffect(() => {
        const sync = () => {
            const visible = document.visibilityState === "visible";
            setFocused(visible ? conversationId : null);
            if (visible) void markRead();
        };

        sync();
        document.addEventListener("visibilitychange", sync);
        return () => {
            document.removeEventListener("visibilitychange", sync);
            setFocused(null);
        };
    }, [conversationId, setFocused, markRead]);

    // Realtime delivered a message for this thread. Its payload is a preview,
    // not a `Message` — there is no `content` in it — so the newest page is
    // re-read rather than a bubble being invented from half a row.
    const seenRevision = useRef(threadRevision);
    useEffect(() => {
        if (threadRevision === seenRevision.current) return;
        seenRevision.current = threadRevision;
        void fetchHead().then(markRead);
    }, [threadRevision, fetchHead, markRead]);

    /**
     * A video attached to a message is stored unscanned and cleared by a
     * background worker. There is no endpoint for a single message, so the
     * wait is watched by re-reading the newest page — a thread is not cached
     * the way the feed is, so this costs one small read per poll.
     */
    useEffect(() => {
        if (!hasPendingMedia) return;

        const startedAt = Date.now();
        const timer = setInterval(() => {
            if (Date.now() - startedAt > POLL_LIMIT_MS) {
                clearInterval(timer);
                return;
            }
            // Asking while nobody is looking spends the read budget on an
            // answer no one will see. The manual refresh stays either way.
            if (document.visibilityState !== "visible") return;
            void fetchHead();
        }, POLL_INTERVAL_MS);

        return () => clearInterval(timer);
    }, [hasPendingMedia, fetchHead]);

    return {
        isLoading,
        isLoadingOlder,
        isRefreshing,
        error,
        notFound,
        hasOlder: cursor !== null,
        loadOlder,
        refresh,
    };
}
