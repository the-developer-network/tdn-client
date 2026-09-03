import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PageShell } from "../shared/layout/PageShell";
import { TrendingTopicsWidget } from "../shared/components/TrendingTopicsWidget";
import { MessageBubble } from "../features/messages/components/MessageBubble";
import { MessageComposer } from "../features/messages/components/MessageComposer";
import { RequestActions } from "../features/messages/components/RequestActions";
import { useConversation } from "../features/messages/hooks/useConversation";
import { useConversationActions } from "../features/messages/hooks/useConversationActions";
import { useMessageStore } from "../features/messages/store/message.store";
import { useAuthStore } from "../core/auth/auth.store";
import { useAuthModalStore } from "../features/auth/store/auth-modal.store";
import { useI18n } from "../shared/hooks/useI18n";

export default function ConversationPage() {
    const { id = "" } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();
    const { openModal } = useAuthModalStore();

    useEffect(() => {
        if (!isAuthenticated) {
            openModal();
            navigate("/", { replace: true });
        }
    }, [isAuthenticated, navigate, openModal]);

    if (!isAuthenticated) return null;

    // Keyed by the thread so switching conversations remounts rather than
    // showing the previous thread while the next one loads.
    return <ConversationView key={id} conversationId={id} />;
}

function ConversationView({ conversationId }: { conversationId: string }) {
    const { t } = useI18n();
    const conversation = useMessageStore((s) => s.activeConversation);
    const messages = useMessageStore((s) => s.messages);
    const { remove } = useConversationActions();
    const latestMineId = messages.find((m) => m.isMine)?.id;
    const {
        isLoading,
        isLoadingOlder,
        isRefreshing,
        error,
        notFound,
        hasOlder,
        loadOlder,
        refresh,
    } = useConversation(conversationId);

    /*
     * The rail stays. It was dropped on the argument that a trending list
     * beside a private conversation reads as an advert, and that was not worth
     * what it cost: `PageShell` centres a fixed-width block, so a page without
     * a rail sat to the left of a 375px void and read as broken rather than as
     * uncluttered. The shell now handles a missing rail properly, but the
     * inconsistency was the real complaint — every other page has this.
     *
     * `fill` puts the viewport height in the shell, where the rest of the
     * breakpoint ladder lives, so nothing here repeats `100dvh` or the bottom
     * bar height.
     */
    return (
        <PageShell rightRail={<TrendingTopicsWidget />} fill>
            <div className="flex h-full flex-col">
                <header className="flex shrink-0 items-center gap-3 border-b border-ink/10 bg-ground/80 px-3 py-3 backdrop-blur-md">
                    <Link
                        to="/messages"
                        aria-label={t("messages.back")}
                        className="rounded-full p-2 text-ink/70 transition-colors hover:bg-ink/10 hover:text-ink"
                    >
                        <ArrowLeft size={20} aria-hidden="true" />
                    </Link>
                    {conversation && (
                        <Link
                            to={`/profile/${conversation.participant.username}`}
                            className="flex min-w-0 items-center gap-3"
                        >
                            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-ink/10 bg-surface-2">
                                {conversation.participant.avatarUrl ? (
                                    <img
                                        src={conversation.participant.avatarUrl}
                                        alt=""
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-blue-600 text-sm font-bold text-on-fill">
                                        {conversation.participant.username[0].toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="truncate font-bold text-ink">
                                    {conversation.participant.fullName ||
                                        conversation.participant.username}
                                </p>
                                <p className="truncate text-xs text-ink/40">
                                    @{conversation.participant.username}
                                </p>
                            </div>
                        </Link>
                    )}
                </header>

                {conversation?.isRequest && (
                    <RequestActions conversation={conversation} />
                )}

                {/*
                 * `flex-col-reverse` over an array the API returns newest
                 * first: index 0 paints at the bottom, which is where a thread
                 * starts reading, and the container is anchored to the bottom
                 * without a scroll-into-view on every render.
                 */}
                <div className="flex flex-1 flex-col-reverse gap-2 overflow-y-auto px-4 py-3">
                    {isLoading && messages.length === 0 && (
                        <div className="space-y-3">
                            {Array.from({ length: 5 }).map((_, index) => (
                                <div
                                    key={index}
                                    className={`h-10 animate-pulse rounded-2xl bg-surface-2 ${
                                        index % 2 ? "ml-auto w-1/2" : "w-2/3"
                                    }`}
                                />
                            ))}
                        </div>
                    )}

                    {notFound && (
                        <div className="py-10 text-center">
                            <p className="font-semibold text-ink">
                                {t("messages.notFound")}
                            </p>
                            <p className="mt-1 text-sm text-ink/50">
                                {t("messages.notFoundHint")}
                            </p>
                        </div>
                    )}

                    {error && !notFound && (
                        <div className="py-10 text-center">
                            <p className="text-ink/60">{error}</p>
                            <button
                                type="button"
                                onClick={() => void refresh()}
                                className="mt-3 text-sm font-semibold text-blue-400 hover:text-blue-300"
                            >
                                {t("messages.retry")}
                            </button>
                        </div>
                    )}

                    {!isLoading &&
                        !notFound &&
                        !error &&
                        messages.length === 0 && (
                            <p className="py-10 text-center text-sm text-ink/50">
                                {t("messages.startHint")}
                            </p>
                        )}

                    {/*
                     * The array runs newest first, so the reader's most recent
                     * message is the first `isMine` in it — the only one that
                     * carries the read state.
                     */}
                    {messages.map((message) => (
                        <MessageBubble
                            key={message.id}
                            message={message}
                            onRefresh={() => void refresh()}
                            isRefreshing={isRefreshing}
                            onDelete={(id) => void remove(id)}
                            otherLastReadAt={conversation?.otherLastReadAt}
                            isLatestMine={message.id === latestMineId}
                        />
                    ))}

                    {/* Last in the DOM, first on screen: the column is
                        reversed, so "older" belongs at the top. */}
                    {hasOlder && (
                        <div className="py-2 text-center">
                            <button
                                type="button"
                                onClick={() => void loadOlder()}
                                disabled={isLoadingOlder}
                                className="text-sm font-semibold text-blue-400 hover:text-blue-300 disabled:opacity-50"
                            >
                                {t("messages.loadOlder")}
                            </button>
                        </div>
                    )}
                </div>

                {/*
                 * No bottom padding here any more: `fill` keeps `pb-16` inside
                 * the shell's fixed height, so the composer already sits above
                 * `BottomNav` without this page knowing how tall that bar is.
                 */}
                <div className="shrink-0">
                    {/*
                     * The other side of a request: the initiator may write,
                     * has nothing to accept, and gets no read receipt until
                     * the recipient accepts. Saying so is what keeps a silent
                     * thread from reading as a delivery failure.
                     */}
                    {conversation?.status === "PENDING" &&
                        !conversation.isRequest && (
                            <p className="border-t border-ink/10 px-4 pt-3 text-center text-xs text-ink/40">
                                {t("messages.awaitingAccept")}
                            </p>
                        )}
                    {conversation?.canSend ? (
                        <MessageComposer conversationId={conversationId} />
                    ) : (
                        conversation && (
                            <p className="border-t border-ink/10 px-4 py-4 text-center text-sm text-ink/50">
                                {conversation.status === "DECLINED"
                                    ? t("messages.declined")
                                    : t("messages.cannotSend")}
                            </p>
                        )
                    )}
                </div>
            </div>
        </PageShell>
    );
}
