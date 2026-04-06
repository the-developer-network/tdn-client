/// <reference types="@cloudflare/workers-types" />

const API_BASE = "https://api.developernetwork.net/api/v1";
const SITE_URL = "https://developernetwork.net";

// Pages that are always included
const STATIC_ROUTES: Array<{
    url: string;
    changefreq: string;
    priority: string;
}> = [
    { url: "/", changefreq: "always", priority: "1.0" },
    { url: "/explore", changefreq: "hourly", priority: "0.9" },
    { url: "/terms-of-service", changefreq: "monthly", priority: "0.3" },
    { url: "/privacy-policy", changefreq: "monthly", priority: "0.3" },
];

interface ApiPost {
    id: string;
    createdAt: string;
    author: { username: string };
}

interface ApiPage {
    data?: ApiPost[];
}

function toW3CDate(iso: string): string {
    return iso.slice(0, 10); // e.g. "2026-04-07"
}

function escapeXml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
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

async function fetchPostPage(page: number, limit: number): Promise<ApiPost[]> {
    try {
        const res = await fetch(
            `${API_BASE}/posts?page=${page}&limit=${limit}`,
        );
        if (!res.ok) return [];
        // API returns either Post[] directly or { data: Post[], ... }
        const body = (await res.json()) as ApiPost[] | ApiPage;
        if (Array.isArray(body)) return body;
        return body.data ?? [];
    } catch {
        return [];
    }
}

export const onRequest: PagesFunction = async () => {
    // Fetch 3 pages of 100 posts (300 total) for broad coverage
    const pages = await Promise.all([
        fetchPostPage(1, 100),
        fetchPostPage(2, 100),
        fetchPostPage(3, 100),
    ]);

    const allPosts = pages.flat();

    // Deduplicate authors
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

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticEntries, ...profileEntries, ...postEntries].join("\n")}
</urlset>`;

    return new Response(xml, {
        headers: {
            "content-type": "application/xml;charset=UTF-8",
            "cache-control":
                "public, max-age=3600, stale-while-revalidate=86400",
            "x-robots-tag": "noindex", // prevent sitemap itself from being indexed
        },
    });
};
