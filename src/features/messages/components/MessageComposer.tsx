import { useRef, useState } from "react";
import { ImagePlus, SendHorizontal, X } from "lucide-react";
import { useI18n } from "../../../shared/hooks/useI18n";
import { useMessageMedia } from "../hooks/useMessageMedia";
import { useSendMessage } from "../hooks/useSendMessage";
import { MESSAGE_MAX_LENGTH, MESSAGE_MAX_MEDIA } from "../api/message.types";

interface MessageComposerProps {
    conversationId: string;
}

/** Warn only near the ceiling; a counter on every message is noise. */
const COUNTER_VISIBLE_FROM = MESSAGE_MAX_LENGTH - 200;

/**
 * The write box.
 *
 * Media is uploaded first and the URLs are attached to the message, so a
 * refused file costs the upload but never the text — the words stay in the box
 * for a second try. The two limits are the server ones, mirrored so the box
 * cannot compose a body that is certain to be rejected: an empty message is
 * `400 EmptyMessageError`, and the send button is simply disabled instead.
 */
export function MessageComposer({ conversationId }: MessageComposerProps) {
    const { t } = useI18n();
    const [content, setContent] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const media = useMessageMedia();
    const { send, isSending } = useSendMessage(conversationId);

    const trimmed = content.trim();
    const isEmpty = trimmed.length === 0 && media.files.length === 0;
    const isBusy = isSending || media.isUploading;

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        if (isEmpty || isBusy) return;

        const mediaUrls = await media.upload();
        // `null` is a failed upload, already toasted. Sending the text alone
        // would quietly drop the attachments the person chose.
        if (mediaUrls === null) return;

        if (await send(trimmed, mediaUrls)) {
            setContent("");
            media.clear();
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="border-t border-ink/10 bg-ground p-3"
        >
            {media.previews.length > 0 && (
                <ul className="mb-2 flex flex-wrap gap-2">
                    {media.previews.map((preview, index) => (
                        <li key={preview} className="relative">
                            <img
                                src={preview}
                                alt=""
                                className="h-16 w-16 rounded-xl border border-ink/10 object-cover"
                            />
                            <button
                                type="button"
                                onClick={() => media.removeFile(index)}
                                aria-label={t("messages.removeAttachment")}
                                className="absolute -right-1.5 -top-1.5 rounded-full bg-scrim/70 p-1 text-on-fill transition-colors hover:bg-scrim"
                            >
                                <X size={12} aria-hidden="true" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <div className="flex items-end gap-2">
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(event) => {
                        media.addFiles(event.target.files);
                        // Cleared so picking the same file twice in a row
                        // still fires a change event.
                        event.target.value = "";
                    }}
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={media.files.length >= MESSAGE_MAX_MEDIA || isBusy}
                    aria-label={t("messages.attach")}
                    className="shrink-0 rounded-full p-2 text-ink/60 transition-colors hover:bg-ink/10 hover:text-ink disabled:opacity-40"
                >
                    <ImagePlus size={20} aria-hidden="true" />
                </button>

                {/*
                 * No `text-sm`: below the `sm` breakpoint every field is forced
                 * to 16px anyway, because iOS Safari zooms into anything
                 * smaller and never zooms back out.
                 */}
                <textarea
                    value={content}
                    onChange={(event) =>
                        setContent(
                            event.target.value.slice(0, MESSAGE_MAX_LENGTH),
                        )
                    }
                    onKeyDown={(event) => {
                        // Enter sends, Shift+Enter breaks the line — but only
                        // where there is a keyboard to hold shift with.
                        if (
                            event.key === "Enter" &&
                            !event.shiftKey &&
                            !("ontouchstart" in window)
                        ) {
                            event.preventDefault();
                            void handleSubmit(event);
                        }
                    }}
                    rows={1}
                    placeholder={t("messages.placeholder")}
                    className="max-h-32 min-h-[42px] flex-1 resize-y rounded-2xl border border-ink/10 bg-surface-1 px-4 py-2.5 text-ink placeholder:text-ink/30 focus:border-ink/30 focus:outline-none"
                />

                <button
                    type="submit"
                    disabled={isEmpty || isBusy}
                    aria-label={t("messages.send")}
                    className="shrink-0 rounded-full bg-blue-500 p-2.5 text-on-fill transition-colors hover:bg-blue-400 disabled:opacity-40"
                >
                    <SendHorizontal size={18} aria-hidden="true" />
                </button>
            </div>

            {content.length > COUNTER_VISIBLE_FROM && (
                <p className="mt-1 text-right text-xs text-ink/40">
                    {content.length} / {MESSAGE_MAX_LENGTH}
                </p>
            )}
        </form>
    );
}
