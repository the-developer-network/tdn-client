import { useCallback, useEffect, useMemo, useState } from "react";
import { messageApi } from "../api/message.api";
import { useToastStore } from "../../../shared/store/toast.store";
import { getErrorMessage } from "../../../shared/utils/error-handler";
import { clearsSelection } from "../../../shared/utils/media-errors";
import { useI18n } from "../../../shared/hooks/useI18n";
import {
    MESSAGE_MAX_FILE_BYTES,
    MESSAGE_MAX_MEDIA,
} from "../api/message.types";

/**
 * The attachments on a message being written.
 *
 * The two limits are checked here as well as on the server, because both
 * answers are knowable without a round trip and the round trip costs one of
 * five writes a minute. The server still decides — this only avoids spending a
 * request to be told something the browser already knew.
 */
export function useMessageMedia() {
    const [files, setFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const addToast = useToastStore((s) => s.addToast);
    const { t } = useI18n();

    const previews = useMemo(
        () => files.map((file) => URL.createObjectURL(file)),
        [files],
    );

    // Revoked when the selection changes or the composer unmounts. Without
    // this every picked file stays in memory for the life of the tab, which on
    // a thread where someone sends photos all afternoon is the whole session.
    useEffect(
        () => () => previews.forEach((url) => URL.revokeObjectURL(url)),
        [previews],
    );

    const addFiles = useCallback(
        (picked: FileList | null) => {
            if (!picked?.length) return;
            const incoming = Array.from(picked);

            const oversized = incoming.find(
                (file) => file.size > MESSAGE_MAX_FILE_BYTES,
            );
            if (oversized) {
                addToast({
                    type: "error",
                    message: t("error.payloadTooLarge"),
                });
                return;
            }

            setFiles((current) => {
                if (current.length + incoming.length > MESSAGE_MAX_MEDIA) {
                    addToast({
                        type: "error",
                        message: t("error.mediaLimitExceeded"),
                    });
                    return current;
                }
                return [...current, ...incoming];
            });
        },
        [addToast, t],
    );

    const removeFile = useCallback((index: number) => {
        setFiles((current) => current.filter((_, i) => i !== index));
    }, []);

    const clear = useCallback(() => setFiles([]), []);

    /**
     * Uploads and returns the URLs, or `null` if it failed.
     *
     * `clearsSelection` decides whether the files survive: a verdict discards
     * all of them — the endpoint processes them in order and returns no URLs
     * at all once one is refused, without saying which — while a 500, a
     * dropped connection or an unreachable checker says nothing about the
     * files and leaves them where they are for another try.
     */
    const upload = useCallback(async (): Promise<string[] | null> => {
        if (files.length === 0) return [];

        setIsUploading(true);
        try {
            const { mediaUrls } = await messageApi.uploadMedia(files);
            setFiles([]);
            return mediaUrls;
        } catch (err) {
            addToast({ type: "error", message: getErrorMessage(err) });
            if (clearsSelection(err)) setFiles([]);
            return null;
        } finally {
            setIsUploading(false);
        }
    }, [files, addToast]);

    return {
        files,
        previews,
        addFiles,
        removeFile,
        clear,
        upload,
        isUploading,
    };
}
