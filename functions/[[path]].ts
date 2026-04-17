/// <reference types="@cloudflare/workers-types" />

const API_BASE = "https://api.developernetwork.net/api/v1";
const SITE_URL = "https://developernetwork.net";
const SITE_NAME = "TDN - The Developer Network";
const DEFAULT_DESCRIPTION =
    "TDN is the social network for developers. Share code, tech news, job postings and connect with the dev community.";
const DEFAULT_IMAGE = `${SITE_URL}/og-default.png`;

interface Post {
    id: string;
    content: string;
    author: { username: string; fullName?: string; avatarUrl: string };
    mediaUrls: string[];
}

interface Profile {
    username: string;
    fullName: string;
    bio: string;
    avatarUrl: string;
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

async function fetchPost(postId: string): Promise<Post | null> {
    try {
        const res = await fetch(`${API_BASE}/posts/${postId}`);
        if (!res.ok) return null;
        const json = (await res.json()) as { data: Post };
        return json.data;
    } catch {
        return null;
    }
}

async function fetchProfile(username: string): Promise<Profile | null> {
    try {
        const res = await fetch(`${API_BASE}/profiles/${username}`);
        if (!res.ok) return null;
        const json = (await res.json()) as { data: Profile };
        return json.data;
    } catch {
        return null;
    }
}

export const onRequest: PagesFunction = async (context) => {
    const url = new URL(context.request.url);
    const pathname = url.pathname;

    // Static assets (js, css, images, etc.) pass through unchanged
    if (/\.\w{2,5}$/.test(pathname)) {
        return context.next();
    }

    // Fetch the static SPA shell
    const assetResponse = await context.env.ASSETS.fetch(
        new Request(`${url.origin}/index.html`, { method: "GET" }),
    );
    if (!assetResponse.ok) {
        return context.next();
    }
    let html = await assetResponse.text();

    const postMatch = pathname.match(/^\/post\/([^/]+)$/);
    const profileMatch = pathname.match(/^\/profile\/([^/]+)$/);

    let tags: string;

    if (postMatch) {
        const post = await fetchPost(postMatch[1]);
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
    } else if (profileMatch) {
        const profile = await fetchProfile(profileMatch[1]);
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
};
