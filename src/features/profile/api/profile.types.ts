import type { PostCategory } from "../../feed/api/feed.types";

export interface Profile {
    /**
     * The account id, and the one every write about this profile carries.
     *
     * `GET /profiles/:username` sends this and does **not** send `userId` —
     * which used to be declared required here while `id` was optional, exactly
     * the wrong way round. Nothing caught it, because a field the server never
     * sends still typechecks as a `string` at every call site; the failure
     * only appears at the far end, as a body whose key `JSON.stringify` quietly
     * dropped.
     */
    id: string;
    /** The older name for `id`. Kept for callers that still read it. */
    userId?: string;
    username: string;
    fullName: string;
    bio: string;
    location: string;
    avatarUrl: string;
    bannerUrl: string;
    socials: Record<string, string>;
    createdAt: string;
    updatedAt: string;
    followersCount: number;
    followingCount?: number;
    postCount: number;
    isMe: boolean;
    isFollowing: boolean;
}

export interface UpdateProfileBody {
    /**
     * The API validates this as `minLength: 2` with no null variant, so it can
     * be changed but not cleared — omit it rather than sending an empty value.
     */
    fullName?: string;
    /** `null` clears the field; omitting it leaves the stored value alone. */
    bio?: string | null;
    /** `null` clears the field; omitting it leaves the stored value alone. */
    location?: string | null;
    socials?: Record<string, string>;
}

export interface AvatarUploadResponse {
    avatarUrl: string;
}

export interface BannerUploadResponse {
    bannerUrl: string;
}

export interface FollowUser {
    userId: string;
    username: string;
    fullName: string;
    avatarUrl: string;
    bio: string;
    isFollowing: boolean;
    isMe: boolean;
}

export interface FollowListMeta {
    limit: number;
    offset: number;
    count: number;
}

export interface SuggestedUser {
    userId: string;
    username: string;
    fullName: string;
    avatarUrl: string;
    bannerUrl: string;
    bio: string;
    followersCount: number;
    isFollowing: boolean;
    isMe: boolean;
}

/**
 * A news bot from `GET /profiles/bots`.
 *
 * Only news bots reach this list. The platform also runs persona accounts that
 * are `isBot` and read as people; the endpoint keeps them out, so there is no
 * client-side filtering to do here.
 *
 * `isFollowing` is only true when the request carried a token — sent
 * anonymously the endpoint answers `false` for everything, which is why
 * `getBots` is neither `isPublic` nor `isAnonymous`.
 */
export interface BotProfile {
    userId: string;
    username: string;
    fullName: string;
    avatarUrl: string;
    bannerUrl: string;
    bio: string;
    /** Never empty: the endpoint only returns bots that carry a category. */
    categories: PostCategory[];
    followersCount: number;
    isFollowing: boolean;
}
