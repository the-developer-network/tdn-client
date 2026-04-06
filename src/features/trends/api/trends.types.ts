export interface Trend {
    tag: string;
    postCount: number;
    category: string;
}

export interface TrendsData {
    trends: Trend[];
}

export interface TrendsMeta {
    timestamp: string;
    windowDays: number;
}

export interface TagSearchItem {
    name: string;
    postCount: number;
    category: string;
}
