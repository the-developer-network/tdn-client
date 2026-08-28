import { api } from "../../../core/api/client";
import type {
    Profile,
    BotProfile,
    FollowUser,
    SuggestedUser,
    UpdateProfileBody,
    AvatarUploadResponse,
    BannerUploadResponse,
} from "./profile.types";
import type { Post, PostCategory } from "../../feed/api/feed.types";

export interface FollowListParams {
    limit?: number;
    offset?: number;
}

/**
 * Both follower endpoints take `PaginationQuerySchema`: `limit` (default 20,
 * max 50) and `offset` (default 0). Omitting them does not mean "everything"
 * — it means the server's first 20, which is how these lists came to stop at
 * twenty with nothing on screen saying so. `limit` is clamped here because
 * the schema answers an over-large value with a 400, and a list that renders
 * an error instead of people is worse than a shorter page.
 */
export const FOLLOW_LIST_MAX_LIMIT = 50;

function followListQuery({ limit = 20, offset = 0 }: FollowListParams): string {
    const query = new URLSearchParams();
    query.set("limit", String(Math.min(limit, FOLLOW_LIST_MAX_LIMIT)));
    query.set("offset", String(offset));
    return query.toString();
}

/**
 * `GET /profiles/bots` takes the same pagination schema as the follow lists —
 * `limit` default 20, min 1, max 50 — and answers an out-of-range value with a
 * 400, so it is clamped here rather than sent and rendered as an error.
 */
export const BOT_LIST_MAX_LIMIT = 50;

export interface BotListParams {
    /**
     * Omitted entirely when empty, which is not the same request: no
     * `categories` means every categorised bot, and the flow relies on that
     * for a user who somehow reaches step two without a field.
     */
    categories?: PostCategory[];
    limit?: number;
    offset?: number;
}

/**
 * The endpoint accepts both a comma-joined value and a repeated key, and they
 * mean the same thing. Comma-joined is the one to send: a bot matches if it
 * carries *any* of the categories, so several fields are one request, not one
 * request per field.
 */
function botListQuery({
    categories = [],
    limit = 20,
    offset = 0,
}: BotListParams): string {
    const query = new URLSearchParams();
    if (categories.length) query.set("categories", categories.join(","));
    query.set(
        "limit",
        String(Math.min(Math.max(limit, 1), BOT_LIST_MAX_LIMIT)),
    );
    query.set("offset", String(offset));
    return query.toString();
}

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

    getFollowers: (
        username: string,
        params: FollowListParams = {},
    ): Promise<FollowUser[]> =>
        api.get<FollowUser[]>(
            `/profiles/${username}/followers?${followListQuery(params)}`,
            { isPublic: true },
        ),

    getFollowing: (
        username: string,
        params: FollowListParams = {},
    ): Promise<FollowUser[]> =>
        api.get<FollowUser[]>(
            `/profiles/${username}/following?${followListQuery(params)}`,
            { isPublic: true },
        ),

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

    /**
     * Deliberately not `isPublic`. Auth is optional on this endpoint, but the
     * token is what fills `isFollowing` — without it every bot comes back
     * `false` and a returning account is handed back the bots it already
     * follows as fresh suggestions.
     */
    getBots: (params: BotListParams = {}): Promise<BotProfile[]> =>
        api.get<BotProfile[]>(`/profiles/bots?${botListQuery(params)}`),

    follow: (targetId: string): Promise<void> =>
        api.post<void>("/follows", { targetId }),

    unfollow: (targetId: string): Promise<void> =>
        api.delete<void>("/follows", {
            body: JSON.stringify({ targetId }),
            headers: { "Content-Type": "application/json" },
        }),
};
