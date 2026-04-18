import { useState, useEffect, useCallback } from "react";
import { profileApi } from "../api/profile.api";
import type { SuggestedUser } from "../api/profile.types";
import { getErrorMessage } from "../../../shared/utils/error-handler";

export function useSuggestions(limit = 10) {
    const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
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
        let cancelled = false;
        profileApi
            .getSuggestions(limit)
            .then((data) => {
                if (!cancelled) setSuggestions(data);
            })
            .catch((err) => {
                if (!cancelled) setError(getErrorMessage(err));
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [limit]);

    return { suggestions, isLoading, error, refetch: fetchSuggestions };
}
