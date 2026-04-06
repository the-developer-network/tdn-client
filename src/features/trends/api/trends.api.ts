import { api } from "../../../core/api/client";
import type { TagSearchItem, TrendsData } from "./trends.types";

export const trendsApi = {
    getTrends: (): Promise<TrendsData> =>
        api.get<TrendsData>("/tags/trends", { isPublic: true }),

    searchTags: (q: string, limit = 10): Promise<TagSearchItem[]> => {
        const qs = `?q=${encodeURIComponent(q)}&limit=${limit}`;
        return api.get<TagSearchItem[]>(`/tags/search${qs}`, {
            isPublic: true,
        });
    },
};
