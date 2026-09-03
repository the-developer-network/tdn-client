import { Link } from "react-router-dom";
import { ImageIcon } from "lucide-react";
import { useI18n } from "../../../shared/hooks/useI18n";
import type { Conversation } from "../api/message.types";

interface ConversationRowProps {
    conversation: Conversation;
}

/**
 * One line of the inbox.
 *
 * The preview is the server truncation, shown as it arrives — building a
 * shorter one here would disagree with the copy realtime writes into the same
 * field, and the row would change wording on every refetch.
 */
export function ConversationRow({ conversation }: ConversationRowProps) {
    const { t, locale } = useI18n();
    const { participant, unreadCount, lastMessagePreview, lastMessageAt } =
        conversation;
    const isUnread = unreadCount > 0;

    return (
        <Link
            to={`/messages/${conversation.id}`}
            className="flex items-center gap-3 border-b border-ink/10 px-4 py-3 transition-colors hover:bg-ink/5"
        >
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-ink/10 bg-surface-2">
                {participant.avatarUrl ? (
                    <img
                        src={participant.avatarUrl}
                        alt=""
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-blue-600 font-bold text-on-fill">
                        {participant.username[0].toUpperCase()}
                    </div>
                )}
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                    <p className="truncate font-bold text-ink">
                        {participant.fullName || participant.username}
                    </p>
                    <p className="truncate text-sm text-ink/40">
                        @{participant.username}
                    </p>
                    {lastMessageAt && (
                        <time
                            dateTime={lastMessageAt}
                            className="ml-auto shrink-0 text-xs text-ink/40"
                        >
                            {new Date(lastMessageAt).toLocaleDateString(locale)}
                        </time>
                    )}
                </div>
                <p
                    className={`truncate text-sm ${
                        isUnread ? "font-semibold text-ink" : "text-ink/60"
                    }`}
                >
                    {lastMessagePreview ?? t("messages.startHint")}
                </p>
            </div>

            {isUnread && (
                <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-blue-500 px-1 text-[11px] font-bold leading-none text-on-fill">
                    {unreadCount > 9 ? "9+" : unreadCount}
                </span>
            )}
        </Link>
    );
}

/**
 * The request tab shows the same row without the unread pip — a request is not
 * a message waiting to be read, it is a decision waiting to be made, and the
 * two counters mean different things.
 */
export function RequestRow({ conversation }: ConversationRowProps) {
    const { t } = useI18n();
    const { participant, lastMessagePreview } = conversation;

    return (
        <Link
            to={`/messages/${conversation.id}`}
            className="flex items-center gap-3 border-b border-ink/10 px-4 py-3 transition-colors hover:bg-ink/5"
        >
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-ink/10 bg-surface-2">
                {participant.avatarUrl ? (
                    <img
                        src={participant.avatarUrl}
                        alt=""
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-blue-600 font-bold text-on-fill">
                        {participant.username[0].toUpperCase()}
                    </div>
                )}
            </div>

            <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ink">
                    {participant.fullName || participant.username}
                </p>
                <p className="flex items-center gap-1.5 truncate text-sm text-ink/60">
                    {lastMessagePreview ?? (
                        <>
                            <ImageIcon size={13} aria-hidden="true" />
                            {t("messages.startHint")}
                        </>
                    )}
                </p>
            </div>
        </Link>
    );
}
