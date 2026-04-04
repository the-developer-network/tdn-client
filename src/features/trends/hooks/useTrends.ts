import { useState, useEffect } from "react";
import { trendsApi } from "../api/trends.api";
import type { Trend } from "../api/trends.types";
import { getErrorMessage } from "../../../shared/utils/error-handler";

export function useTrends() {
    const [trends, setTrends] = useState<Trend[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        trendsApi
            .getTrends()
            .then((data) => setTrends(data.trends))
            .catch((err) => setError(getErrorMessage(err)))
            .finally(() => setIsLoading(false));
    }, []);

    return { trends, isLoading, error };
}
