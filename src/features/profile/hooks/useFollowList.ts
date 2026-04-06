import { useState, useEffect } from "react";
import { profileApi } from "../api/profile.api";
import type { FollowUser } from "../api/profile.types";
import { getErrorMessage } from "../../../shared/utils/error-handler";

export function useFollowList(
    username: string,
    type: "followers" | "following",
    enabled: boolean,
) {
    const [users, setUsers] = useState<FollowUser[]>([]);
    const [fetchedKey, setFetchedKey] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const currentKey = enabled ? `${username}:${type}` : null;
    // Derived: loading while enabled and we haven't fetched this combination yet
    const isLoading = currentKey !== null && currentKey !== fetchedKey;

    useEffect(() => {
        if (!enabled) return;

        let cancelled = false;

        const request =
            type === "followers"
                ? profileApi.getFollowers(username)
                : profileApi.getFollowing(username);

        request
            .then((data) => {
                if (cancelled) return;
                setUsers(data);
                setError(null);
                setFetchedKey(`${username}:${type}`);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(getErrorMessage(err));
                setFetchedKey(`${username}:${type}`);
            });

        return () => {
            cancelled = true;
        };
    }, [username, type, enabled]);

    return { users, isLoading, error };
}
