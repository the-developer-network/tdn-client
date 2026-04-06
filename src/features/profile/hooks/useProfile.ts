import { useState, useEffect } from "react";
import { profileApi } from "../api/profile.api";
import type { Profile } from "../api/profile.types";
import { getErrorMessage } from "../../../shared/utils/error-handler";

export function useProfile(username: string) {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [fetchedUsername, setFetchedUsername] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Derived: loading is true while the current username hasn't been fetched yet
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
    }, [username]);

    return { profile: isLoading ? null : profile, isLoading, error };
}
