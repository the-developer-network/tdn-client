import { api } from "../../../core/api/client";
import type { TrendsData } from "./trends.types";

export const trendsApi = {
    getTrends: (): Promise<TrendsData> =>
        api.get<TrendsData>("/trends", { isPublic: true }),
};
