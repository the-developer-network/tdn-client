/**
 * A block is stored directionally on the API and read as a union: one row
 * hides two accounts from each other everywhere. The direction is still what
 * the client renders from, which is why a profile carries two flags rather
 * than one — see `Profile.isBlocked` / `Profile.isBlockedBy`.
 */
export interface BlockActionResponse {
    isBlocked: boolean;
}

/**
 * One row of `GET /blocks`.
 *
 * The shape follows `FollowUser` (`userId`, not `id`), minus the flags that
 * cannot mean anything here: a blocked account is invisible, so there is no
 * `isFollowing` to show and blocking yourself is a 400.
 */
export interface BlockedUser {
    userId: string;
    username: string;
    fullName: string;
    avatarUrl: string;
    bio: string | null;
}
