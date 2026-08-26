import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PostCategory } from "../../feed/api/feed.types";

interface OnboardingState {
    /**
     * Kept per user id rather than as a single boolean: a shared browser would
     * otherwise let a second account skip the flow on the strength of the
     * first one having finished it.
     */
    completedUserIds: string[];
    /** The fields picked in step one, for later personalisation. */
    interests: PostCategory[];

    isCompleted: (userId: string) => boolean;
    complete: (userId: string, interests: PostCategory[]) => void;
    reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
    persist(
        (set, get) => ({
            completedUserIds: [],
            interests: [],

            isCompleted: (userId) => get().completedUserIds.includes(userId),

            complete: (userId, interests) =>
                set((state) => ({
                    completedUserIds: state.completedUserIds.includes(userId)
                        ? state.completedUserIds
                        : [...state.completedUserIds, userId],
                    // An empty pick means the gate marked it done off the
                    // server's follow count, not a trip through the picker —
                    // that must not wipe interests chosen earlier.
                    interests: interests.length ? interests : state.interests,
                })),

            reset: () => set({ completedUserIds: [], interests: [] }),
        }),
        { name: "tdn-onboarding" },
    ),
);
