/**
 * Static pages advertised in `/sitemap.xml`.
 *
 * Every `url` here must be a path declared in `src/app/router.tsx`. The two
 * lists live in separate TypeScript projects and drifted once already —
 * `/terms-of-service` and `/privacy-policy` were published for months while
 * the router served `/terms` and `/privacy`, so crawlers were pointed at URLs
 * that fall through to the catch-all and redirect home.
 *
 * This module is deliberately free of imports and Cloudflare types so the app
 * test project can import it and assert the two lists still agree.
 */
export interface StaticRoute {
    url: string;
    changefreq: string;
    priority: string;
}

export const STATIC_ROUTES: StaticRoute[] = [
    { url: "/", changefreq: "always", priority: "1.0" },
    { url: "/explore", changefreq: "hourly", priority: "0.9" },
    { url: "/terms", changefreq: "monthly", priority: "0.3" },
    { url: "/privacy", changefreq: "monthly", priority: "0.3" },
];
