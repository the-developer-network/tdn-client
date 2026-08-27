import { useCallback, useState } from "react";
import { profileApi } from "../../profile/api/profile.api";
import { useToastStore } from "../../../shared/store/toast.store";
import { getErrorMessage } from "../../../shared/utils/error-handler";

/**
 * Tracks who the new account has followed during onboarding.
 *
 * `useFollowAction` keeps that state inside each card, which is right on a
 * profile page and wrong here: the flow's only gate is "how many so far", and
 * a counter cannot be assembled from state the cards hold privately. So the
 * set lives above the list, and the cards are told what to render.
 */
export function useOnboardingFollows() {
    const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
    const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

    const addToast = useToastStore((state) => state.addToast);

    const toggle = useCallback(
        async (userId: string) => {
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
        followedCount: followedIds.size,
        isPending: (userId: string) => pendingIds.has(userId),
        toggle,
    };
}
