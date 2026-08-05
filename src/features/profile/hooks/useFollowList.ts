import { useState, useEffect, useCallback } from "react";
import { profileApi } from "../api/profile.api";
import type { FollowUser } from "../api/profile.types";
import { getErrorMessage } from "../../../shared/utils/error-handler";

const LIMIT = 20;

export function useFollowList(
    username: string,
    type: "followers" | "following",
    enabled: boolean,
) {
    const [users, setUsers] = useState<FollowUser[]>([]);
    const [fetchedKey, setFetchedKey] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const currentKey = enabled ? `${username}:${type}` : null;
    // Derived: loading while enabled and we haven't fetched this combination yet
    const isLoading = currentKey !== null && currentKey !== fetchedKey;

    useEffect(() => {
        if (!enabled) return;

        let cancelled = false;

        const fetchPage =
            type === "followers"
                ? profileApi.getFollowers
                : profileApi.getFollowing;

        fetchPage(username, { limit: LIMIT, offset: 0 })
            .then((data) => {
                if (cancelled) return;
                setUsers(data);
                // The endpoint reports a total in `meta`, but the client
                // unwraps `data` before we see it, so a full page is the only
                // signal that there is another one behind it.
                setHasMore(data.length === LIMIT);
                setError(null);
                setFetchedKey(`${username}:${type}`);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(getErrorMessage(err));
                setHasMore(false);
                setFetchedKey(`${username}:${type}`);
            });

        return () => {
            cancelled = true;
        };
    }, [username, type, enabled]);

    const loadMore = useCallback(() => {
        if (isLoadingMore) return;
        setIsLoadingMore(true);

        const fetchPage =
            type === "followers"
                ? profileApi.getFollowers
                : profileApi.getFollowing;

        // Paging by offset rather than a page counter keeps this correct when
        // the previous page came back short, which the endpoint allows.
        fetchPage(username, { limit: LIMIT, offset: users.length })
            .then((data) => {
                setUsers((prev) => [...prev, ...data]);
                setHasMore(data.length === LIMIT);
            })
            .catch((err) => setError(getErrorMessage(err)))
            .finally(() => setIsLoadingMore(false));
    }, [username, type, users.length, isLoadingMore]);

    return { users, isLoading, isLoadingMore, error, hasMore, loadMore };
}
