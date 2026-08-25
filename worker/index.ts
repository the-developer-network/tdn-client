/// <reference types="@cloudflare/workers-types" />

import { STATIC_ROUTES } from "./static-routes";

const DEFAULT_API_BASE = "https://api.developernetwork.net/api/v1";
const SITE_URL = "https://developernetwork.net";
const SITE_NAME = "TDN - The Developer Network";
const DEFAULT_DESCRIPTION =
    "TDN is the social network for developers. Share code, tech news, articles and connect with the dev community.";
const DEFAULT_IMAGE = `${SITE_URL}/og-default.png`;

interface Env {
    ASSETS: Fetcher;
    /**
     * The API this Worker reads post and profile metadata from. Left unset in
     * deployment, where `DEFAULT_API_BASE` is what runs; the e2e suite sets it
     * (`wrangler dev --var API_BASE:...`) so a test run does not call the
     * production API three times per sitemap request.
     */
    API_BASE?: string;
}

function resolveApiBase(env: Env): string {
    return env.API_BASE || DEFAULT_API_BASE;
}

interface Post {
    id: string;
    content: string;
    author: { username: string; fullName?: string; avatarUrl: string };
    mediaUrls: string[];
}

interface ArticleMeta {
    slug: string;
    title: string;
    excerpt: string;
    coverImageUrl: string | null;
    author: { username: string; fullName?: string; avatarUrl: string };
}

interface ApiArticle {
    slug: string;
    publishedAt: string | null;
    createdAt: string;
}

interface ApiArticlePage {
    data?: ApiArticle[];
}

interface Profile {
    username: string;
    fullName: string;
    bio: string;
    avatarUrl: string;
}

interface ApiPost {
    id: string;
    createdAt: string;
    author: { username: string };
}

interface ApiPage {
    data?: ApiPost[];
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function buildMetaTags(
    title: string,
    description: string,
    image: string,
    url: string,
): string {
    const t = escapeHtml(title);
    const d = escapeHtml(description);
    const i = escapeHtml(image);
    const u = escapeHtml(url);

    return `
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:title" content="${t}" />
    <meta property="og:description" content="${d}" />
    <meta property="og:image" content="${i}" />
    <meta property="og:url" content="${u}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@devnetworknet" />
    <meta name="twitter:title" content="${t}" />
    <meta name="twitter:description" content="${d}" />
    <meta name="twitter:image" content="${i}" />
    <meta name="description" content="${d}" />`;
}

function injectIntoHead(html: string, tags: string): string {
    // Remove existing OG, Twitter, and description meta tags to avoid duplicates
    html = html.replace(
        /<meta\s+(property="og:|name="twitter:|name="description")[^>]*>\s*/g,
        "",
    );
    return html.replace("</head>", `${tags}\n  </head>`);
}

async function fetchPost(
    apiBase: string,
    postId: string,
): Promise<Post | null> {
    try {
        const res = await fetch(`${apiBase}/posts/${postId}`);
        if (!res.ok) return null;
        const json = (await res.json()) as { data: Post };
        return json.data;
    } catch {
        return null;
    }
}

async function fetchArticle(
    apiBase: string,
    slug: string,
): Promise<ArticleMeta | null> {
    try {
        const res = await fetch(`${apiBase}/articles/${slug}`);
        if (!res.ok) return null;
        const json = (await res.json()) as { data: ArticleMeta };
        return json.data;
    } catch {
        return null;
    }
}

async function fetchProfile(
    apiBase: string,
    username: string,
): Promise<Profile | null> {
    try {
        const res = await fetch(`${apiBase}/profiles/${username}`);
        if (!res.ok) return null;
        const json = (await res.json()) as { data: Profile };
        return json.data;
    } catch {
        return null;
    }
}

async function handlePage(url: URL, env: Env): Promise<Response> {
    const pathname = url.pathname;
    const apiBase = resolveApiBase(env);

    const assetResponse = await env.ASSETS.fetch(
        new Request(`${url.origin}/index.html`, { method: "GET" }),
    );
    if (!assetResponse.ok) {
        return env.ASSETS.fetch(new Request(url.toString()));
    }
    let html = await assetResponse.text();

    const postMatch = pathname.match(/^\/post\/([^/]+)$/);
    const profileMatch = pathname.match(/^\/profile\/([^/]+)$/);
    const articleMatch = pathname.match(/^\/articles\/([^/]+)$/);

    let tags: string;

    if (postMatch) {
        const post = await fetchPost(apiBase, postMatch[1]);
        if (post) {
            const authorName =
                post.author.fullName || `@${post.author.username}`;
            const description =
                post.content.length > 155
                    ? post.content.slice(0, 152) + "..."
                    : post.content;
            const image =
                post.mediaUrls?.[0] || post.author.avatarUrl || DEFAULT_IMAGE;
            tags = buildMetaTags(
                `${authorName} on TDN`,
                description,
                image,
                `${SITE_URL}/post/${post.id}`,
            );
        } else {
            tags = buildMetaTags(
                SITE_NAME,
                DEFAULT_DESCRIPTION,
                DEFAULT_IMAGE,
                url.href,
            );
        }
    } else if (articleMatch) {
        const article = await fetchArticle(apiBase, articleMatch[1]);
        if (article) {
            // The excerpt is already capped at 300 characters server-side and
            // has its markdown marks stripped, so it needs trimming for the
            // meta budget but no further processing.
            const description =
                article.excerpt.length > 155
                    ? article.excerpt.slice(0, 152) + "..."
                    : article.excerpt;
            tags = buildMetaTags(
                article.title,
                description,
                article.coverImageUrl ||
                    article.author.avatarUrl ||
                    DEFAULT_IMAGE,
                `${SITE_URL}/articles/${article.slug}`,
            );
        } else {
            tags = buildMetaTags(
                SITE_NAME,
                DEFAULT_DESCRIPTION,
                DEFAULT_IMAGE,
                url.href,
            );
        }
    } else if (profileMatch) {
        const profile = await fetchProfile(apiBase, profileMatch[1]);
        if (profile) {
            const displayName = profile.fullName || `@${profile.username}`;
            const description =
                profile.bio ||
                `Check out ${displayName}'s profile on TDN - The Developer Network.`;
            tags = buildMetaTags(
                `${displayName} (@${profile.username}) - TDN`,
                description,
                profile.avatarUrl || DEFAULT_IMAGE,
                `${SITE_URL}/profile/${profile.username}`,
            );
        } else {
            tags = buildMetaTags(
                SITE_NAME,
                DEFAULT_DESCRIPTION,
                DEFAULT_IMAGE,
                url.href,
            );
        }
    } else {
        tags = buildMetaTags(
            SITE_NAME,
            DEFAULT_DESCRIPTION,
            DEFAULT_IMAGE,
            url.href,
        );
    }

    html = injectIntoHead(html, tags);

    return new Response(html, {
        headers: {
            "content-type": "text/html;charset=UTF-8",
            "cache-control": "public, max-age=60, stale-while-revalidate=300",
        },
    });
}

function escapeXml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function toW3CDate(iso: string): string {
    return iso.slice(0, 10);
}

function urlEntry(
    loc: string,
    lastmod: string,
    changefreq: string,
    priority: string,
): string {
    return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

async function fetchPostPage(
    apiBase: string,
    page: number,
    limit: number,
): Promise<ApiPost[]> {
    try {
        const res = await fetch(`${apiBase}/posts?page=${page}&limit=${limit}`);
        if (!res.ok) return [];
        const body = (await res.json()) as ApiPost[] | ApiPage;
        if (Array.isArray(body)) return body;
        return body.data ?? [];
    } catch {
        return [];
    }
}

async function fetchArticlePage(
    apiBase: string,
    page: number,
    limit: number,
): Promise<ApiArticle[]> {
    try {
        const res = await fetch(
            `${apiBase}/articles?page=${page}&limit=${limit}`,
        );
        if (!res.ok) return [];
        const body = (await res.json()) as ApiArticle[] | ApiArticlePage;
        if (Array.isArray(body)) return body;
        return body.data ?? [];
    } catch {
        return [];
    }
}

async function handleSitemap(env: Env): Promise<Response> {
    const apiBase = resolveApiBase(env);
    // The articles endpoint caps `limit` at 50, unlike posts.
    const [pages, articlePages] = await Promise.all([
        Promise.all([
            fetchPostPage(apiBase, 1, 100),
            fetchPostPage(apiBase, 2, 100),
            fetchPostPage(apiBase, 3, 100),
        ]),
        Promise.all([
            fetchArticlePage(apiBase, 1, 50),
            fetchArticlePage(apiBase, 2, 50),
        ]),
    ]);

    const allPosts = pages.flat();
    const allArticles = articlePages.flat();

    const seenUsernames = new Set<string>();
    const uniquePosts: ApiPost[] = [];
    for (const post of allPosts) {
        if (!seenUsernames.has(post.author.username)) {
            seenUsernames.add(post.author.username);
        }
        uniquePosts.push(post);
    }

    const today = new Date().toISOString().slice(0, 10);

    const staticEntries = STATIC_ROUTES.map((r) =>
        urlEntry(`${SITE_URL}${r.url}`, today, r.changefreq, r.priority),
    );

    const profileEntries = [...seenUsernames].map((username) =>
        urlEntry(
            `${SITE_URL}/profile/${encodeURIComponent(username)}`,
            today,
            "weekly",
            "0.7",
        ),
    );

    const postEntries = uniquePosts.map((post) =>
        urlEntry(
            `${SITE_URL}/post/${post.id}`,
            toW3CDate(post.createdAt),
            "weekly",
            "0.6",
        ),
    );

    const articleEntries = allArticles.map((article) =>
        urlEntry(
            `${SITE_URL}/articles/${encodeURIComponent(article.slug)}`,
            toW3CDate(article.publishedAt ?? article.createdAt),
            "weekly",
            "0.8",
        ),
    );

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticEntries, ...profileEntries, ...articleEntries, ...postEntries].join("\n")}
</urlset>`;

    return new Response(xml, {
        headers: {
            "content-type": "application/xml;charset=UTF-8",
            "cache-control":
                "public, max-age=3600, stale-while-revalidate=86400",
            "x-robots-tag": "noindex",
        },
    });
}

/**
 * True for the paths the build actually produces: Vite's hashed bundles under
 * `/assets/`, and everything copied from `public/`, which lands at the root.
 *
 * Deliberately not "the path ends in something that looks like an extension".
 * Usernames are `^[a-zA-Z0-9._]+$`, so `john.smith` is an ordinary handle, and
 * testing the whole pathname mistook `/profile/john.smith` for a file and
 * served a 404 in place of the app. Requiring a single segment keeps every
 * `/profile/:username` and `/post/:id` on the SPA side no matter what the
 * parameter contains.
 */
function isAssetPath(pathname: string): boolean {
    if (pathname.startsWith("/assets/")) return true;
    return /^\/[^/]+\.\w{2,5}$/.test(pathname);
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);
        const pathname = url.pathname;

        // Generated routes are matched before the asset check below, which
        // would otherwise treat "/sitemap.xml" as a static file and look for an
        // asset that does not exist.
        if (pathname === "/sitemap.xml") {
            return handleSitemap(env);
        }

        // Static assets pass through unchanged
        if (isAssetPath(pathname)) {
            return env.ASSETS.fetch(request);
        }

        // All other routes: SPA shell with OG meta injection
        return handlePage(url, env);
    },
} satisfies ExportedHandler<Env>;
