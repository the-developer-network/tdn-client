import { useState } from "react";
import { profileApi } from "../api/profile.api";
import { useAuthStore } from "../../../core/auth/auth.store";
import { useAuthModalStore } from "../../auth/store/auth-modal.store";

export function useFollowAction(
    targetId: string,
    initialIsFollowing: boolean,
    initialFollowersCount: number,
) {
    const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
    const [followersCount, setFollowersCount] = useState(initialFollowersCount);

    const [prev, setPrev] = useState({
        initialIsFollowing,
        initialFollowersCount,
    });
    if (prev.initialIsFollowing !== initialIsFollowing) {
        setPrev((p) => ({ ...p, initialIsFollowing }));
        setIsFollowing(initialIsFollowing);
    }
    if (prev.initialFollowersCount !== initialFollowersCount) {
        setPrev((p) => ({ ...p, initialFollowersCount }));
        setFollowersCount(initialFollowersCount);
    }

    const [isLoading, setIsLoading] = useState(false);

    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const { openModal, setStep } = useAuthModalStore();

    async function handleFollow() {
        if (!isAuthenticated) {
            setStep("login");
            openModal();
            return;
        }
        if (isLoading) return;

        // Optimistic update
        const prevFollowing = isFollowing;
        const prevCount = followersCount;
        setIsFollowing(!isFollowing);
        setFollowersCount(
            isFollowing ? followersCount - 1 : followersCount + 1,
        );
        setIsLoading(true);

        try {
            if (prevFollowing) {
                await profileApi.unfollow(targetId);
            } else {
                await profileApi.follow(targetId);
            }
        } catch {
            // Rollback on error
            setIsFollowing(prevFollowing);
            setFollowersCount(prevCount);
        } finally {
            setIsLoading(false);
        }
    }

    return { isFollowing, followersCount, isLoading, handleFollow };
}
