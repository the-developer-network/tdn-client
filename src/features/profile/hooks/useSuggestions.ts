import { useState, useEffect, useCallback } from "react";
import { profileApi } from "../api/profile.api";
import type { SuggestedUser } from "../api/profile.types";
import { getErrorMessage } from "../../../shared/utils/error-handler";

export function useSuggestions(limit = 10) {
    const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSuggestions = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await profileApi.getSuggestions(limit);
            setSuggestions(data);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    }, [limit]);

    useEffect(() => {
        fetchSuggestions();
    }, [fetchSuggestions]);

    return { suggestions, isLoading, error, refetch: fetchSuggestions };
}
