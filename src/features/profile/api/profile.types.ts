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
    fullName?: string;
    bio?: string;
    location?: string;
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
