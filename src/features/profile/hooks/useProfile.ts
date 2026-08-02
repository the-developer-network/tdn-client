import { useState, useEffect, useCallback } from "react";
import { profileApi } from "../api/profile.api";
import type { Profile } from "../api/profile.types";
import { getErrorMessage } from "../../../shared/utils/error-handler";

export function useProfile(username: string) {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [fetchedUsername, setFetchedUsername] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

    const isLoading = fetchedUsername !== username;

    useEffect(() => {
        let cancelled = false;

        profileApi
            .getProfile(username)
            .then((data) => {
                if (cancelled) return;
                setProfile(data);
                setError(null);
                setFetchedUsername(username);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(getErrorMessage(err));
                setFetchedUsername(username);
            });

        return () => {
            cancelled = true;
        };
    }, [username, reloadKey]);

    // Clearing `fetchedUsername` puts the hook back into its loading state, so
    // the page shows the skeleton again rather than the stale error.
    const retry = useCallback(() => {
        setError(null);
        setFetchedUsername(null);
        setReloadKey((key) => key + 1);
    }, []);

    return { profile: isLoading ? null : profile, isLoading, error, retry };
}
