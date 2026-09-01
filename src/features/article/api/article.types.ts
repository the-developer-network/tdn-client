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
    /**
     * The cover only. No `mediaPending` alongside it: a cover is always an
     * image, and images are checked inside the upload request rather than
     * after it, so a cover is never waiting.
     */
    isSensitive: boolean;
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

export interface GetMyArticlesParams {
    page?: number;
    limit?: number;
    status?: ArticleStatus;
}

/**
 * Field limits the server enforces. Validation errors come back as a bare
 * 400 with "Invalid data format provided." and no field name, so the editor
 * has to check these itself to say anything useful.
 */
export const ARTICLE_LIMITS = {
    titleMax: 160,
    bodyMax: 100_000,
    excerptMax: 300,
    coverAltMax: 160,
    tagsMax: 5,
    categoriesMax: 5,
    /** The whole request body, not just the markdown. */
    requestBytesMax: 256 * 1024,
    coverBytesMax: 5 * 1024 * 1024,
} as const;

/** Tags are normalised server-side but rejected before that if they fail this. */
export const TAG_PATTERN = /^[a-z0-9-]{1,30}$/;

export interface CreateArticleBody {
    title: string;
    body: string;
    excerpt?: string;
    coverImageKey?: string;
    coverImageAlt?: string;
    tags?: string[];
    categories?: ArticleCategory[];
}

/**
 * Every field is optional, and the three nullable ones take `null` to clear
 * them. `null` and `undefined` mean different things here: omitting a field
 * leaves it alone, sending `null` erases it. Building this from a form that
 * collapses the two loses the ability to remove a cover.
 */
export interface UpdateArticleBody {
    title?: string;
    body?: string;
    excerpt?: string | null;
    coverImageKey?: string | null;
    coverImageAlt?: string | null;
    tags?: string[];
    categories?: ArticleCategory[];
}

export interface CoverUploadResponse {
    coverImageKey: string;
    coverImageUrl: string;
}
