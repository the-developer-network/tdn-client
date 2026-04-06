import { useState, useEffect } from "react";
import { settingsApi } from "../api/settings.api";
import { getErrorMessage } from "../../../shared/utils/error-handler";
import type { AccountInfo } from "../api/settings.types";

export function useAccountInfo() {
    const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    async function fetchAccountInfo(cancelled = false) {
        setIsLoading(true);
        setError(null);
        try {
            const res = await settingsApi.getAccountInfo();
            if (!cancelled) setAccountInfo(res);
        } catch (err) {
            console.error("[useAccountInfo] fetch error:", err);
            if (!cancelled) setError(getErrorMessage(err));
        } finally {
            if (!cancelled) setIsLoading(false);
        }
    }

    useEffect(() => {
        let cancelled = false;
        void fetchAccountInfo(cancelled);
        return () => {
            cancelled = true;
        };
    }, []);

    function refetch() {
        void fetchAccountInfo();
    }

    return { accountInfo, isLoading, error, refetch };
}
