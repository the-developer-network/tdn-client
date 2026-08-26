/**
 * One suggested account, normalised across the three shapes it can arrive in:
 * a post author, an article author, and `SuggestedUser` from
 * `/profiles/suggestions`.
 *
 * `bio` and `followersCount` are optional because post and article authors
 * carry neither — the card renders them only when they are there. `isFollowing`
 * is absent on purpose: this list is only ever shown to an account that
 * follows nobody, so everything in it starts unfollowed.
 */
export interface OnboardingAccount {
    userId: string;
    username: string;
    fullName: string;
    avatarUrl: string;
    bio?: string;
    followersCount?: number;
    /**
     * How many of the fetched posts and articles in the chosen fields this
     * account wrote. The ranking key — and 0 for accounts that came from the
     * popularity fallback rather than from the content.
     */
    contentCount: number;
}

/** How many accounts a new user has to follow before the flow lets them out. */
export const MIN_FOLLOWS = 5;
