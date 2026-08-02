export interface Profile {
    id?: string;
    userId: string;
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
