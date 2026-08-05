import { beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../tests/msw-server";

import worker from "./index";

const API = "https://api.developernetwork.net/api/v1";

const SHELL = `<!doctype html><html><head><title>TDN</title>
<meta name="description" content="placeholder" />
<meta property="og:title" content="placeholder" />
</head><body><div id="root"></div></body></html>`;

/**
 * Stands in for the Cloudflare `ASSETS` binding. Records what it was asked
 * for, because the routing bugs this file covers are all about a request
 * reaching the asset store when it should have reached the SPA shell.
 */
function makeEnv() {
    const requested: string[] = [];
    return {
        requested,
        env: {
            ASSETS: {
                fetch: async (input: Request | string) => {
                    const url = typeof input === "string" ? input : input.url;
                    requested.push(new URL(url).pathname);
                    if (new URL(url).pathname === "/index.html") {
                        return new Response(SHELL, {
                            headers: { "content-type": "text/html" },
                        });
                    }
                    return new Response("Not found", { status: 404 });
                },
            } as unknown as Fetcher,
        },
    };
}

function get(path: string) {
    return new Request(`https://developernetwork.net${path}`);
}

beforeEach(() => {
    vi.restoreAllMocks();
});

describe("worker routing", () => {
    // Usernames are `^[a-zA-Z0-9._]+$`, so `john.smith` is ordinary. The
    // static-asset guard tested the whole pathname for a trailing extension,
    // so every dotted username was mistaken for a file and served a 404
    // instead of the app.
    describe("a username with a dot in it", () => {
        it.each([
            "/profile/john.smith",
            "/profile/alice.dev",
            "/profile/bob.io",
        ])("serves the app shell for %s", async (path) => {
            server.use(
                http.get(`${API}/profiles/:username`, () =>
                    HttpResponse.json({ data: null }, { status: 404 }),
                ),
            );
            const { env, requested } = makeEnv();

            const res = await worker.fetch(get(path), env);

            expect(res.status).toBe(200);
            expect(res.headers.get("content-type")).toContain("text/html");
            expect(requested).toEqual(["/index.html"]);
        });

        it("still resolves the profile for its OG tags", async () => {
            server.use(
                http.get(`${API}/profiles/:username`, ({ params }) =>
                    HttpResponse.json({
                        data: {
                            username: params.username,
                            fullName: "John Smith",
                            bio: "Backend engineer",
                            avatarUrl: "https://cdn.example.com/a.png",
                        },
                    }),
                ),
            );
            const { env } = makeEnv();

            const res = await worker.fetch(get("/profile/john.smith"), env);
            const html = await res.text();

            expect(html).toContain('content="John Smith (@john.smith) - TDN"');
            expect(html).toContain('content="Backend engineer"');
        });
    });

    describe("requests that really are assets", () => {
        it.each(["/assets/index-abc123.js", "/favicon.svg", "/robots.txt"])(
            "passes %s straight to the asset store",
            async (path) => {
                const { env, requested } = makeEnv();

                await worker.fetch(get(path), env);

                expect(requested).toEqual([path]);
            },
        );
    });

    describe("meta injection", () => {
        it("replaces the shell's placeholder tags rather than duplicating them", async () => {
            const { env } = makeEnv();

            const res = await worker.fetch(get("/"), env);
            const html = await res.text();

            expect(html.match(/property="og:title"/g)).toHaveLength(1);
            expect(html.match(/name="description"/g)).toHaveLength(1);
        });

        it("escapes markup coming from post content", async () => {
            server.use(
                http.get(`${API}/posts/:id`, () =>
                    HttpResponse.json({
                        data: {
                            id: "p1",
                            content: "</title><script>alert(1)</script>",
                            author: {
                                username: "bob",
                                fullName: "Bob",
                                avatarUrl: "",
                            },
                            mediaUrls: [],
                        },
                    }),
                ),
            );
            const { env } = makeEnv();

            const res = await worker.fetch(get("/post/p1"), env);
            const html = await res.text();

            expect(html).not.toContain("<script>alert(1)</script>");
            expect(html).toContain("&lt;script&gt;");
        });
    });

    describe("/sitemap.xml", () => {
        it("is generated rather than looked up as a file", async () => {
            server.use(
                http.get(`${API}/posts`, () =>
                    HttpResponse.json({
                        data: [
                            {
                                id: "p1",
                                createdAt: "2026-01-02T03:04:05.000Z",
                                author: { username: "alice" },
                            },
                        ],
                    }),
                ),
            );
            const { env, requested } = makeEnv();

            const res = await worker.fetch(get("/sitemap.xml"), env);
            const xml = await res.text();

            expect(requested).toEqual([]);
            expect(res.headers.get("content-type")).toContain(
                "application/xml",
            );
            expect(xml).toContain("<loc>https://developernetwork.net/</loc>");
            expect(xml).toContain(
                "<loc>https://developernetwork.net/post/p1</loc>",
            );
            expect(xml).toContain("<lastmod>2026-01-02</lastmod>");
        });
    });
});
