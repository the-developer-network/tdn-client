import { useState } from "react";
import { Trash2, ImageOff } from "lucide-react";
import { SensitiveMedia } from "../../../shared/components/ui/SensitiveMedia";
import { PendingMedia } from "../../../shared/components/ui/PendingMedia";
import { Modal } from "../../../shared/components/ui/Modal";
import { Button } from "../../../shared/components/ui/Button";
import { RichText } from "../../../shared/components/ui/RichText";
import { useI18n } from "../../../shared/hooks/useI18n";
import { isPendingMessage } from "../hooks/useSendMessage";
import type { Message } from "../api/message.types";

interface MessageBubbleProps {
    message: Message;
    /** Absent where there is nothing to refresh into. */
    onRefresh?: () => void;
    isRefreshing?: boolean;
    onDelete?: (id: string) => void;
    /**
     * The other participant last opened the thread at this time. Read state is
     * per conversation, so this is one watermark rather than a receipt per
     * message — a sent message counts as seen when it predates it.
     */
    otherLastReadAt?: string | null;
}

function isVideo(url: string): boolean {
    return /\.(mp4|m4v|mov|webm|3gp|3g2)(\?|$)/i.test(url);
}

/**
 * One message.
 *
 * The four server flags are independent and are rendered independently — a
 * withdrawn message can be one that also had media refused, and a sensitive
 * one can still be waiting on its video.
 *
 * `mediaRejected` is the one place this app says "media removed" out loud, and
 * it is deliberate. The rule for posts is the opposite: a post whose media was
 * refused is byte-for-byte a post that never had any, so claiming otherwise
 * would mean reconstructing the difference from session memory and showing two
 * readers different things. A message carries the fact in a field, so there is
 * nothing to reconstruct and both sides read the same row.
 */
export function MessageBubble({
    message,
    onRefresh,
    isRefreshing,
    onDelete,
    otherLastReadAt,
}: MessageBubbleProps) {
    const { t } = useI18n();
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const isMine = message.isMine;

    if (message.isDeleted) {
        return (
            <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <p className="max-w-[75%] rounded-2xl border border-dashed border-ink/20 px-4 py-2 text-sm italic text-ink/40">
                    {t("messages.deleted")}
                </p>
            </div>
        );
    }

    const isSeen =
        isMine &&
        !!otherLastReadAt &&
        new Date(message.createdAt) <= new Date(otherLastReadAt);

    // A message that has not been acknowledged by the server has no id to
    // withdraw, so it is not offered the control.
    const canDelete = isMine && onDelete && !isPendingMessage(message.id);

    return (
        <div
            className={`group flex flex-col ${isMine ? "items-end" : "items-start"}`}
        >
            <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    isMine
                        ? "bg-blue-500 text-on-fill"
                        : "bg-surface-1 text-ink"
                }`}
            >
                {message.content && (
                    <div className="whitespace-pre-wrap break-words text-[15px]">
                        <RichText text={message.content} />
                    </div>
                )}

                {message.mediaPending && (
                    <PendingMedia
                        onRefresh={onRefresh}
                        isRefreshing={isRefreshing}
                    />
                )}

                {message.mediaRejected && (
                    <div className="mt-2 flex items-center gap-2 rounded-xl border border-ink/10 bg-surface-2 px-3 py-2 text-ink/60">
                        <ImageOff size={16} aria-hidden="true" />
                        <div className="text-xs">
                            <p className="font-semibold">
                                {t("media.removed")}
                            </p>
                            <p className="opacity-80">
                                {t("media.removedHint")}
                            </p>
                        </div>
                    </div>
                )}

                {message.mediaUrls.length > 0 && (
                    <SensitiveMedia isSensitive={message.isSensitive}>
                        <div
                            className={`mt-2 grid gap-1 ${
                                message.mediaUrls.length > 1
                                    ? "grid-cols-2"
                                    : "grid-cols-1"
                            }`}
                        >
                            {message.mediaUrls.map((url) =>
                                isVideo(url) ? (
                                    <video
                                        key={url}
                                        src={url}
                                        controls
                                        className="max-h-72 w-full rounded-xl object-cover"
                                    />
                                ) : (
                                    <img
                                        key={url}
                                        src={url}
                                        alt=""
                                        className="max-h-72 w-full rounded-xl object-cover"
                                    />
                                ),
                            )}
                        </div>
                    </SensitiveMedia>
                )}
            </div>

            <div className="mt-0.5 flex items-center gap-2 px-1">
                {isMine && (
                    <span className="text-[11px] text-ink/40">
                        {isSeen ? t("messages.seen") : t("messages.sent")}
                    </span>
                )}
                {canDelete && (
                    <button
                        type="button"
                        onClick={() => setIsConfirmingDelete(true)}
                        aria-label={t("messages.delete")}
                        className="text-ink/30 opacity-0 transition-opacity hover:text-red-400 focus-visible:opacity-100 group-hover:opacity-100"
                    >
                        <Trash2 size={13} aria-hidden="true" />
                    </button>
                )}
            </div>

            <Modal
                isOpen={isConfirmingDelete}
                onClose={() => setIsConfirmingDelete(false)}
            >
                <div className="p-6 pt-14">
                    <h2 className="text-lg font-bold text-ink">
                        {t("messages.deleteConfirm")}
                    </h2>
                    <p className="mt-2 text-sm text-ink/60">
                        {t("messages.deleteConfirmBody")}
                    </p>
                    <div className="mt-6 flex justify-end gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setIsConfirmingDelete(false)}
                        >
                            {t("messages.cancel")}
                        </Button>
                        <Button
                            size="sm"
                            className="bg-red-500 text-on-fill hover:bg-red-400"
                            onClick={() => {
                                setIsConfirmingDelete(false);
                                onDelete?.(message.id);
                            }}
                        >
                            {t("messages.deleteAction")}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
