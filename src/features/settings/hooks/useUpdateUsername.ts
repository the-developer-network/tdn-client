import { useState } from "react";
import { settingsApi } from "../api/settings.api";
import { useAuthStore } from "../../../core/auth/auth.store";
import { getErrorMessage } from "../../../shared/utils/error-handler";

export function useUpdateUsername() {
    const updateUser = useAuthStore((s) => s.updateUser);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Returns whether the update went through. Callers cannot read `error`
    // straight after awaiting this — that closure still holds the value from
    // the render the submit started in.
    async function handleSubmit(newUsername: string): Promise<boolean> {
        setIsLoading(true);
        setError(null);
        setSuccess(false);

        try {
            await settingsApi.updateUsername({ newUsername });
            updateUser({ username: newUsername });
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
