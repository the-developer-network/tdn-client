import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../tests/msw-server";

import worker from "./index";

const API = "https://api.developernetwork.net/api/v1";
const STUB_API = "https://stub.internal.test/api/v1";

const SHELL = `<!doctype html><html><head><title>TDN</title>
<meta name="description" content="placeholder" />
<meta property="og:title" content="placeholder" />
</head><body><div id="root"></div></body></html>`;

/**
 * Stands in for the Cloudflare `ASSETS` binding. Records what it was asked
 * for, because the routing bugs this file covers are all about a request
 * reaching the asset store when it should have reached the SPA shell.
 */
function makeEnv(apiBase?: string) {
    const requested: string[] = [];
    return {
        requested,
        env: {
            API_BASE: apiBase,
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

    describe("article metadata", () => {
        const article = {
            slug: "clean-architecture",
            title: "Clean Architecture",
            excerpt: "Keeping transport concerns out of the domain layer.",
            coverImageUrl: "https://cdn.example.com/cover.png",
            author: {
                username: "bob",
                fullName: "Bob",
                avatarUrl: "https://cdn.example.com/bob.png",
            },
        };

        it("injects the article's own title, excerpt and cover", async () => {
            server.use(
                http.get(`${API}/articles/:slug`, () =>
                    HttpResponse.json({ data: article }),
                ),
            );
            const { env } = makeEnv();

            const res = await worker.fetch(
                get("/articles/clean-architecture"),
                env,
            );
            const html = await res.text();

            expect(html).toContain(
                '<meta property="og:title" content="Clean Architecture" />',
            );
            expect(html).toContain(
                'content="https://cdn.example.com/cover.png"',
            );
            expect(html).toContain(
                "https://developernetwork.net/articles/clean-architecture",
            );
        });

        it("falls back to the author avatar when there is no cover", async () => {
            server.use(
                http.get(`${API}/articles/:slug`, () =>
                    HttpResponse.json({
                        data: { ...article, coverImageUrl: null },
                    }),
                ),
            );
            const { env } = makeEnv();

            const html = await (
                await worker.fetch(get("/articles/clean-architecture"), env)
            ).text();

            expect(html).toContain('content="https://cdn.example.com/bob.png"');
        });

        // A draft belonging to someone else answers 404, and so does a slug
        // that never existed. Both must land on the ordinary site defaults —
        // never on a page that hints an unpublished article is there.
        it("uses the site defaults when the article cannot be read", async () => {
            server.use(
                http.get(
                    `${API}/articles/:slug`,
                    () => new HttpResponse(null, { status: 404 }),
                ),
            );
            const { env } = makeEnv();

            const html = await (
                await worker.fetch(get("/articles/some-draft"), env)
            ).text();

            expect(html).toContain(
                '<meta property="og:title" content="TDN - The Developer Network" />',
            );
            expect(html).not.toContain("unpublished");
        });

        it("escapes markup coming from an article title", async () => {
            server.use(
                http.get(`${API}/articles/:slug`, () =>
                    HttpResponse.json({
                        data: {
                            ...article,
                            title: "</title><script>alert(1)</script>",
                        },
                    }),
                ),
            );
            const { env } = makeEnv();

            const html = await (
                await worker.fetch(get("/articles/x"), env)
            ).text();

            expect(html).not.toContain("<script>alert(1)</script>");
            expect(html).toContain("&lt;script&gt;");
        });

        // `/articles` is the list page, one segment long — it must not be
        // mistaken for an article slug and sent to the API.
        it("leaves the list page on the site defaults", async () => {
            let called = false;
            server.use(
                http.get(`${API}/articles/:slug`, () => {
                    called = true;
                    return HttpResponse.json({ data: article });
                }),
            );
            const { env } = makeEnv();

            const html = await (
                await worker.fetch(get("/articles"), env)
            ).text();

            expect(called).toBe(false);
            expect(html).toContain(
                '<meta property="og:title" content="TDN - The Developer Network" />',
            );
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

    // The Worker reads post and profile metadata over the network, so with a
    // hardcoded base every run of the e2e suite calls the production API.
    // `API_BASE` is what lets a test deployment point somewhere else; these
    // tests cover the choice itself rather than the tags it produces.
    describe("which API it reads metadata from", () => {
        const outgoing: string[] = [];

        function profileNamed(fullName: string) {
            return {
                username: "alice",
                fullName,
                bio: `${fullName} bio`,
                avatarUrl: "",
            };
        }

        function postFrom(origin: string) {
            return {
                id: `post-from-${origin}`,
                createdAt: "2026-01-02T03:04:05.000Z",
                content: `content from ${origin}`,
                author: { username: "alice", fullName: "Alice", avatarUrl: "" },
                mediaUrls: [],
            };
        }

        beforeEach(() => {
            outgoing.length = 0;
            server.events.on("request:start", ({ request }) => {
                outgoing.push(request.url);
            });
            // Both origins answer. A request sent to the wrong one then fails
            // an assertion instead of escaping to the real network, where
            // `onUnhandledRequest: "warn"` would let it through.
            server.use(
                http.get(`${API}/profiles/:username`, () =>
                    HttpResponse.json({ data: profileNamed("Production") }),
                ),
                http.get(`${STUB_API}/profiles/:username`, () =>
                    HttpResponse.json({ data: profileNamed("Stub") }),
                ),
                http.get(`${API}/posts/:id`, () =>
                    HttpResponse.json({ data: postFrom("production") }),
                ),
                http.get(`${STUB_API}/posts/:id`, () =>
                    HttpResponse.json({ data: postFrom("stub") }),
                ),
                http.get(`${API}/posts`, () =>
                    HttpResponse.json({ data: [postFrom("production")] }),
                ),
                http.get(`${STUB_API}/posts`, () =>
                    HttpResponse.json({ data: [postFrom("stub")] }),
                ),
            );
        });

        afterEach(() => {
            server.events.removeAllListeners();
        });

        it("reads a profile from the API_BASE binding when one is set", async () => {
            const { env } = makeEnv(STUB_API);

            const html = await (
                await worker.fetch(get("/profile/alice"), env)
            ).text();

            expect(html).toContain("Stub (@alice) - TDN");
            expect(outgoing).toEqual([`${STUB_API}/profiles/alice`]);
        });

        it("reads a post from the API_BASE binding when one is set", async () => {
            const { env } = makeEnv(STUB_API);

            const html = await (
                await worker.fetch(get("/post/p1"), env)
            ).text();

            expect(html).toContain("content from stub");
            expect(outgoing).toEqual([`${STUB_API}/posts/p1`]);
        });

        it("builds the sitemap from the API_BASE binding when one is set", async () => {
            const { env } = makeEnv(STUB_API);

            const xml = await (
                await worker.fetch(get("/sitemap.xml"), env)
            ).text();

            expect(xml).toContain("/post/post-from-stub");
            expect(outgoing.every((url) => url.startsWith(STUB_API))).toBe(
                true,
            );
        });

        it("falls back to the production API when the binding is unset", async () => {
            const { env } = makeEnv();

            const html = await (
                await worker.fetch(get("/profile/alice"), env)
            ).text();

            expect(html).toContain("Production (@alice) - TDN");
            expect(outgoing).toEqual([`${API}/profiles/alice`]);
        });
    });
});
