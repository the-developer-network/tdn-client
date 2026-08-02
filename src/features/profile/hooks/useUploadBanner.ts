import { useState, useRef, useEffect } from "react";
import { profileApi } from "../api/profile.api";
import { getErrorMessage } from "../../../shared/utils/error-handler";
import { useI18n } from "../../../shared/hooks/useI18n";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

interface UseUploadBannerOptions {
    onSuccess: (bannerUrl: string) => void;
}

export function useUploadBanner({ onSuccess }: UseUploadBannerOptions) {
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
            const res = await profileApi.uploadBanner(file);
            onSuccess(res.bannerUrl);
        } catch (err) {
            setError(getErrorMessage(err));
            setPreview(null);
        } finally {
            setIsLoading(false);
        }
    }

    return { upload, isLoading, error, previewUrl };
}
