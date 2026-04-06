import { useState } from "react";
import { settingsApi } from "../api/settings.api";
import { getErrorMessage } from "../../../shared/utils/error-handler";

export function useUpdateEmail() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    async function handleSubmit(newEmail: string) {
        setIsLoading(true);
        setError(null);
        setSuccess(false);

        try {
            await settingsApi.updateEmail({ newEmail });
            setSuccess(true);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    }

    return { handleSubmit, isLoading, error, success };
}
