import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { settingsApi } from "../api/settings.api";
import { useAuthStore } from "../../../core/auth/auth.store";
import { getErrorMessage } from "../../../shared/utils/error-handler";

export function useDeleteAccount() {
    const logout = useAuthStore((s) => s.logout);
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleDelete() {
        setIsLoading(true);
        setError(null);

        try {
            await settingsApi.deleteAccount();
            await logout();
            navigate("/");
        } catch (err) {
            setError(getErrorMessage(err));
            setIsLoading(false);
        }
    }

    return { handleDelete, isLoading, error };
}
