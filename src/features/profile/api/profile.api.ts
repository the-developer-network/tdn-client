import { api } from "../../../core/api/client";
import type {
    Profile,
    FollowUser,
    SuggestedUser,
    UpdateProfileBody,
    AvatarUploadResponse,
    BannerUploadResponse,
} from "./profile.types";
import type { Post } from "../../feed/api/feed.types";

export const profileApi = {
    getProfile: (username: string): Promise<Profile> =>
        api.get<Profile>(`/profiles/${username}`, { isPublic: true }),

    getUserPosts: (
        username: string,
        params: { page?: number; limit?: number } = {},
    ): Promise<Post[]> => {
        const query = new URLSearchParams();
        query.set("page", String(params.page ?? 1));
        query.set("limit", String(params.limit ?? 20));
        return api.get<Post[]>(`/users/${username}/posts?${query.toString()}`, {
            isPublic: true,
        });
    },

    getFollowers: (username: string): Promise<FollowUser[]> =>
        api.get<FollowUser[]>(`/profiles/${username}/followers`, {
            isPublic: true,
        }),

    getFollowing: (username: string): Promise<FollowUser[]> =>
        api.get<FollowUser[]>(`/profiles/${username}/following`, {
            isPublic: true,
        }),

    updateProfile: (body: UpdateProfileBody): Promise<Profile> =>
        api.patch<Profile>("/profiles/me", body),

    uploadAvatar: (file: File): Promise<AvatarUploadResponse> => {
        const formData = new FormData();
        formData.append("file", file);
        return api.patch<AvatarUploadResponse>(
            "/profiles/me/avatar",
            formData,
            {
                contentType: false,
            },
        );
    },

    uploadBanner: (file: File): Promise<BannerUploadResponse> => {
        const formData = new FormData();
        formData.append("file", file);
        return api.patch<BannerUploadResponse>(
            "/profiles/me/banner",
            formData,
            {
                contentType: false,
            },
        );
    },

    searchProfiles: (q: string, limit = 10): Promise<Profile[]> => {
        const qs = `?q=${encodeURIComponent(q)}&limit=${limit}`;
        return api.get<Profile[]>(`/profiles/search${qs}`, { isPublic: true });
    },

    getSuggestions: (limit = 10): Promise<SuggestedUser[]> =>
        api.get<SuggestedUser[]>(`/profiles/suggestions?limit=${limit}`),

    follow: (targetId: string): Promise<void> =>
        api.post<void>("/follows", { targetId }),

    unfollow: (targetId: string): Promise<void> =>
        api.delete<void>("/follows", {
            body: JSON.stringify({ targetId }),
            headers: { "Content-Type": "application/json" },
        }),
};
