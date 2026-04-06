import { useState } from "react";
import { profileApi } from "../api/profile.api";
import { getErrorMessage } from "../../../shared/utils/error-handler";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

interface UseUploadAvatarOptions {
    onSuccess: (avatarUrl: string) => void;
}

export function useUploadAvatar({ onSuccess }: UseUploadAvatarOptions) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    async function upload(file: File) {
        if (file.size > MAX_SIZE) {
            setError("File is too large. Maximum size is 5 MB.");
            return;
        }

        setError(null);
        setPreviewUrl(URL.createObjectURL(file));
        setIsLoading(true);

        try {
            const res = await profileApi.uploadAvatar(file);
            onSuccess(res.avatarUrl);
        } catch (err) {
            setError(getErrorMessage(err));
            setPreviewUrl(null);
        } finally {
            setIsLoading(false);
        }
    }

    return { upload, isLoading, error, previewUrl };
}
