/**
 * Mirrors `PostCategory` — the API uses one category enum for posts and
 * articles alike. Kept as its own union so the article module does not depend
 * on the feed module for a value the server owns.
 */
export type ArticleCategory = "AI" | "GAME" | "MOBILE" | "BACKEND" | "FRONTEND";

export type ArticleStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface ArticleAuthor {
    id: string;
    username: string;
    fullName?: string;
    avatarUrl: string;
    isMe?: boolean;
}

export interface ArticleTag {
    name: string;
}

/**
 * What the list endpoints return: every article field except `body`.
 *
 * The omission is deliberate on the server — a body runs to 100.000 characters,
 * so a page of 50 would be megabytes of markdown. Cards must render `excerpt`;
 * reaching for `body` here yields `undefined`, not a short string.
 *
 * `id` and `slug` both matter and are not interchangeable: the reading routes
 * take the `slug`, while like, bookmark and comment all take the `id`.
 */
export interface ArticleSummary {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    coverImageUrl: string | null;
    coverImageAlt: string | null;
    readingTimeMinutes: number;
    likeCount: number;
    commentCount: number;
    isLiked: boolean;
    isBookmarked: boolean;
    status: ArticleStatus;
    publishedAt: string | null;
    createdAt: string;
    author: ArticleAuthor;
    tags: ArticleTag[];
    categories: ArticleCategory[];
}

/** What `GET /articles/:slug` returns — a summary plus the raw markdown body. */
export interface Article extends ArticleSummary {
    body: string;
}

export interface GetArticlesParams {
    page?: number;
    /** The endpoint caps this at 50. */
    limit?: number;
    tag?: string;
    authorUsername?: string;
    categories?: ArticleCategory[];
    followedOnly?: boolean;
}
