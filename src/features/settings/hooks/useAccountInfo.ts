import { useState, useEffect } from "react";
import { settingsApi } from "../api/settings.api";
import { getErrorMessage } from "../../../shared/utils/error-handler";
import type { AccountInfo } from "../api/settings.types";

export function useAccountInfo() {
    const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    async function fetchAccountInfo() {
        setIsLoading(true);
        setError(null);
        try {
            const res = await settingsApi.getAccountInfo();
            setAccountInfo(res);
        } catch (err) {
            console.error("[useAccountInfo] fetch error:", err);
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        let cancelled = false;
        settingsApi
            .getAccountInfo()
            .then((res) => {
                if (!cancelled) setAccountInfo(res);
            })
            .catch((err) => {
                console.error("[useAccountInfo] fetch error:", err);
                if (!cancelled) setError(getErrorMessage(err));
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    function refetch() {
        void fetchAccountInfo();
    }

    return { accountInfo, isLoading, error, refetch };
}
