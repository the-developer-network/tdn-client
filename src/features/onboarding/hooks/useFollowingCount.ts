import { useEffect, useState } from "react";
import { profileApi } from "../../profile/api/profile.api";
import { useAuthStore } from "../../../core/auth/auth.store";

/**
 * How many people the signed-in account already follows.
 *
 * The gate lets an account through at `MIN_FOLLOWS`, so the flow has to credit
 * the follows already on the books — telling someone who follows four people
 * to follow five more is a different, wrong requirement.
 *
 * Read here rather than handed over from the gate so the page is correct on a
 * reload or a direct visit to `/onboarding`, where no gate ran. A failure
 * counts as zero: the same fail-open the gate takes, and it only ever asks for
 * more, never fewer.
 */
export function useFollowingCount() {
    const username = useAuthStore((state) => state.user?.username);

    const [count, setCount] = useState(0);
    // Nothing to wait for without a username, so the initial value settles it
    // rather than an effect writing state on the first render.
    const [isLoading, setIsLoading] = useState(!!username);

    useEffect(() => {
        if (!username) return;

        let cancelled = false;
        profileApi
            .getProfile(username)
            .then((profile) => {
                if (!cancelled) setCount(profile.followingCount ?? 0);
            })
            .catch(() => {
                if (!cancelled) setCount(0);
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [username]);

    return { count, isLoading };
}
