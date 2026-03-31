import { api } from "../../../core/api/client";

export interface ProfileResponse {
    fullName: string;
    avatarUrl: string;
}

export const profileApi = {
    getProfile: (username: string) =>
        api.get<ProfileResponse>(`/profiles/${username}`),
};
