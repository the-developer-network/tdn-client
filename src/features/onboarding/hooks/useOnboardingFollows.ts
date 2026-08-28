import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { profileApi } from "../../profile/api/profile.api";
import { useToastStore } from "../../../shared/store/toast.store";
import { getErrorMessage } from "../../../shared/utils/error-handler";
import type { OnboardingAccount } from "../onboarding.types";

/**
 * Tracks who the new account follows while it is in the flow.
 *
 * `useFollowAction` keeps that state inside each card, which is right on a
 * profile page and wrong here: the flow's only gate is "how many so far", and
 * a counter cannot be assembled from state the cards hold privately. So the
 * set lives above the list, and the cards are told what to render.
 *
 * Two sets, not one, because they answer different questions. `followedIds` is
 * what a card renders. `serverFollowedIds` is what was already true when the
 * bot arrived, and subtracting it gives `netFollowChange` — the only honest
 * input to the gate, since the profile's `followingCount` already counts every
 * bot the user followed on an earlier visit. Counting the seeded ones again
 * would let a returning user out having followed nobody.
 */
export function useOnboardingFollows(accounts: OnboardingAccount[]) {
    const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
    const [serverFollowedIds, setServerFollowedIds] = useState<Set<string>>(
        new Set(),
    );
    const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

    const addToast = useToastStore((state) => state.addToast);

    /**
     * Every bot the seeding below has already ruled on. Without it, appending
     * a second page re-seeds the first one and quietly restores a bot the user
     * had just unfollowed.
     */
    const seenIds = useRef<Set<string>>(new Set());

    useEffect(() => {
        const fresh = accounts.filter((a) => !seenIds.current.has(a.userId));
        if (fresh.length === 0) return;

        fresh.forEach((a) => seenIds.current.add(a.userId));

        const alreadyFollowing = fresh
            .filter((a) => a.isFollowing)
            .map((a) => a.userId);
        if (alreadyFollowing.length === 0) return;

        setFollowedIds((prev) => new Set([...prev, ...alreadyFollowing]));
        setServerFollowedIds((prev) => new Set([...prev, ...alreadyFollowing]));
    }, [accounts]);

    const netFollowChange = useMemo(() => {
        let net = 0;
        for (const id of followedIds) {
            if (!serverFollowedIds.has(id)) net += 1;
        }
        for (const id of serverFollowedIds) {
            if (!followedIds.has(id)) net -= 1;
        }
        return net;
    }, [followedIds, serverFollowedIds]);

    const toggle = useCallback(
        async (userId: string) => {
            // Also what keeps the request budget down: a user tapping a slow
            // row repeatedly sends one request, not one per tap.
            if (pendingIds.has(userId)) return;

            const wasFollowing = followedIds.has(userId);

            setFollowedIds((prev) => {
                const next = new Set(prev);
                if (wasFollowing) next.delete(userId);
                else next.add(userId);
                return next;
            });
            setPendingIds((prev) => new Set(prev).add(userId));

            try {
                // `userId`, never `username` — the follow endpoint takes the
                // id, and the list is the only place it comes from.
                if (wasFollowing) await profileApi.unfollow(userId);
                else await profileApi.follow(userId);
            } catch (err) {
                setFollowedIds((prev) => {
                    const next = new Set(prev);
                    if (wasFollowing) next.add(userId);
                    else next.delete(userId);
                    return next;
                });
                // The toast only ever shows a message meant for a reader. The
                // raw rejection is the only thing that says which request
                // failed and what the server actually answered, and without
                // it a failure here cannot be chased at all.
                console.error(
                    `${wasFollowing ? "Unfollow" : "Follow"} failed for ${userId}:`,
                    err,
                );
                addToast({ type: "error", message: getErrorMessage(err) });
            } finally {
                setPendingIds((prev) => {
                    const next = new Set(prev);
                    next.delete(userId);
                    return next;
                });
            }
        },
        [followedIds, pendingIds, addToast],
    );

    return {
        followedIds,
        serverFollowedIds,
        netFollowChange,
        isPending: (userId: string) => pendingIds.has(userId),
        toggle,
    };
}
