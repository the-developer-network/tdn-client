import { useState, useEffect, useRef } from "react";
import { trendsApi } from "../api/trends.api";
import type { TagSearchItem } from "../api/trends.types";
import { getErrorMessage } from "../../../shared/utils/error-handler";

export function useTagSearch(minChars = 2, limit = 10) {
    const [query, setQueryState] = useState("");
    const [results, setResults] = useState<TagSearchItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    function setQuery(value: string) {
        setQueryState(value);
        if (value.length >= minChars) {
            setIsLoading(true);
        } else {
            setIsLoading(false);
            setResults([]);
            setError(null);
        }
    }

    useEffect(() => {
        if (query.length < minChars) return;

        if (debounceRef.current) clearTimeout(debounceRef.current);
        let cancelled = false;

        debounceRef.current = setTimeout(() => {
            trendsApi
                .searchTags(query, limit)
                .then((res) => {
                    if (cancelled) return;
                    setResults(res);
                    setError(null);
                })
                .catch((err) => {
                    if (cancelled) return;
                    setError(getErrorMessage(err));
                })
                .finally(() => {
                    if (cancelled) return;
                    setIsLoading(false);
                });
        }, 300);

        return () => {
            cancelled = true;
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
                debounceRef.current = null;
            }
        };
    }, [query, minChars, limit]);

    return {
        query,
        setQuery,
        results,
        isLoading,
        error,
        clear: () => setQuery(""),
    };
}
