import { useState } from "react";
import { settingsApi } from "../api/settings.api";
import { getErrorMessage } from "../../../shared/utils/error-handler";

export function useUpdateEmail() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Returns whether the update went through — see the note in
    // useUpdateUsername for why `error` cannot be read straight after awaiting.
    async function handleSubmit(newEmail: string): Promise<boolean> {
        setIsLoading(true);
        setError(null);
        setSuccess(false);

        try {
            await settingsApi.updateEmail({ newEmail });
            setSuccess(true);
            return true;
        } catch (err) {
            setError(getErrorMessage(err));
            return false;
        } finally {
            setIsLoading(false);
        }
    }

    return { handleSubmit, isLoading, error, success };
}
