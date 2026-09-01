import { useState, useRef, useEffect } from "react";
import { profileApi } from "../api/profile.api";
import { getErrorMessage } from "../../../shared/utils/error-handler";
import { withModerationRetry } from "../../../shared/utils/media-errors";
import { useI18n } from "../../../shared/hooks/useI18n";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

interface UseUploadAvatarOptions {
    onSuccess: (avatarUrl: string) => void;
}

export function useUploadAvatar({ onSuccess }: UseUploadAvatarOptions) {
    const { t } = useI18n();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // The preview stays on screen after a successful upload, so it can only be
    // released when it is replaced or the hook unmounts — never on success.
    const objectUrlRef = useRef<string | null>(null);

    function setPreview(url: string | null) {
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = url;
        setPreviewUrl(url);
    }

    useEffect(
        () => () => {
            if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        },
        [],
    );

    async function upload(file: File) {
        if (file.size > MAX_SIZE) {
            setError(t("editProfile.uploadTooLarge"));
            return;
        }

        setError(null);
        setPreview(URL.createObjectURL(file));
        setIsLoading(true);

        try {
            // A 503 means the checker was unreachable, not that the
            // image was refused. The preview is dropped on failure and
            // the hook keeps no file, so there is no retry to offer by
            // hand — absorbing one blink here is the only retry there is.
            const res = await withModerationRetry(() =>
                profileApi.uploadAvatar(file),
            );
            onSuccess(res.avatarUrl);
        } catch (err) {
            setError(getErrorMessage(err));
            setPreview(null);
        } finally {
            setIsLoading(false);
        }
    }

    return { upload, isLoading, error, previewUrl };
}
