import { test, expect } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import {
    STUB_POST_AUTHOR,
    STUB_POST_DATE,
    STUB_POST_ID,
    stubPostContent,
    stubProfileName,
} from "./api-stub-data.ts";

/**
 * These run against `wrangler dev` serving the real build, not against Vite.
 * Everything here is invisible to the other specs: the asset layer decides
 * what reaches the Worker at all, and the Worker is what injects the tags
 * crawlers read.
 *
 * `worker/index.test.ts` covers the Worker's logic with a stubbed `env`.
 * What only this file can show is the two layers wired together.
 *
 * The API behind it is `e2e/worker/api-stub.ts`, reached because the Wrangler
 * webServer sets `--var API_BASE`. That is what makes the metadata below
 * something to assert rather than whatever production held today.
 */

/**
 * `@cloudflare/vite-plugin` splits the build in two: the client goes to
 * `dist/client`, the Worker bundle to `dist/<worker-name>`. Nothing is written
 * to `dist/` itself, so `dist/index.html` only ever exists as a leftover from
 * a build predating the plugin — which is why pointing at it passed locally
 * and failed on every fresh checkout.
 *
 * Read inside the test rather than at module scope. Playwright imports every
 * spec after the webServers are up, but a throw during that import is a load
 * error, not a test failure: it takes down the whole run, app specs included,
 * and reports a stack instead of a diff.
 */
const here = dirname(fileURLToPath(import.meta.url));
const BUILT_SHELL = resolve(here, "../../dist/client/index.html");

/**
 * `twitter:site` is emitted by `buildMetaTags` and appears nowhere in the
 * built shell, so its presence proves the Worker produced the response
 * rather than the asset store handing back `index.html` untouched. That
 * distinction is the whole point of these tests and cannot be made from the
 * status code, which is 200 either way.
 */
const WORKER_ONLY_TAG = 'name="twitter:site"';

test("the built shell carries no worker tags, so the marker is meaningful", () => {
    expect(
        existsSync(BUILT_SHELL),
        `${BUILT_SHELL} is missing. The Wrangler webServer runs \`pnpm run build\` before it serves anything, so by the time this runs the file should exist — check where the build actually writes the client.`,
    ).toBe(true);

    expect(readFileSync(BUILT_SHELL, "utf8")).not.toContain(WORKER_ONLY_TAG);
});

test.describe("routing", () => {
    // Usernames are `^[a-zA-Z0-9._]+$`. When the asset check tested the whole
    // pathname for a trailing extension, `/profile/john.smith` was mistaken
    // for a file and handed to the asset store, which returns the untouched
    // shell under `not_found_handling: single-page-application`. The page
    // still rendered; what was lost was every tag a crawler reads.
    for (const username of ["john.smith", "alice.dev", "bob.io"]) {
        test(`the worker handles /profile/${username}`, async ({ request }) => {
            const res = await request.get(`/profile/${username}`);

            expect(res.status()).toBe(200);
            expect(res.headers()["content-type"]).toContain("text/html");

            const html = await res.text();
            expect(html).toContain(WORKER_ONLY_TAG);
            // Not just "the Worker answered" — it resolved the profile and
            // built the title from what the API gave it.
            expect(html).toContain(
                `content="${stubProfileName(username)} (@${username}) - TDN"`,
            );
        });
    }

    test("the worker handles a plain username too", async ({ request }) => {
        const res = await request.get("/profile/alice");

        expect(res.status()).toBe(200);
        expect(await res.text()).toContain(WORKER_ONLY_TAG);
    });

    test("a post's own content becomes its description", async ({
        request,
    }) => {
        const html = await (await request.get(`/post/${STUB_POST_ID}`)).text();

        expect(html).toContain(WORKER_ONLY_TAG);
        expect(html).toContain(`content="${stubPostContent(STUB_POST_ID)}"`);
    });

    test("a real asset is served as itself, not as the shell", async ({
        request,
    }) => {
        const res = await request.get("/favicon.svg");

        expect(res.status()).toBe(200);
        expect(res.headers()["content-type"]).toContain("image/svg+xml");
    });
});

test.describe("meta injection", () => {
    test("the shell's placeholder tags are replaced, not duplicated", async ({
        request,
    }) => {
        const html = await (await request.get("/")).text();

        expect(html.match(/property="og:title"/g)).toHaveLength(1);
        expect(html.match(/name="description"/g)).toHaveLength(1);
    });

    /**
     * Against the real built shell, not a fixture. The shell ships its own
     * `<title>`, indented inside `<head>`, and a second one appended below it
     * does not win — the first in the document is the one search engines read.
     * Every page on the site was titled "TDN - The Developer Network" because
     * of it, which is invisible when sharing a link (the OG tags were right)
     * and fatal when searching for one.
     */
    test("the shell's own title is replaced, not appended to", async ({
        request,
    }) => {
        const html = await (await request.get(`/post/${STUB_POST_ID}`)).text();

        const titles = [...html.matchAll(/<title>([\s\S]*?)<\/title>/g)].map(
            (m) => m[1],
        );
        expect(titles).toHaveLength(1);
        expect(titles[0]).toContain("on TDN");
    });

    /**
     * The real build, not a fixture: this is what Search Console actually
     * fetches to keep the property verified. It has to survive both the build
     * and the Worker's rewrite of the head.
     */
    test("the site-verification tag reaches the served page", async ({
        request,
    }) => {
        const html = await (await request.get("/")).text();

        expect(html.match(/name="google-site-verification"/g)).toHaveLength(1);
    });

    test("a canonical points at the page it was served for", async ({
        request,
    }) => {
        const html = await (await request.get(`/post/${STUB_POST_ID}`)).text();

        const canonicals = html.match(/<link\s+rel="canonical"[^>]*>/g) ?? [];
        expect(canonicals).toHaveLength(1);
        expect(canonicals[0]).toContain(`/post/${STUB_POST_ID}`);
    });
});

test.describe("/sitemap.xml", () => {
    test("is generated by the worker rather than looked up as a file", async ({
        request,
    }) => {
        const res = await request.get("/sitemap.xml");

        expect(res.status()).toBe(200);
        expect(res.headers()["content-type"]).toContain("application/xml");

        const xml = await res.text();
        expect(xml).toContain("<urlset");
        // Every static route must be advertised. These drifted from the
        // router once already, which is why `worker/static-routes.ts` exists.
        for (const path of ["/", "/explore", "/terms", "/privacy"]) {
            expect(xml).toContain(
                `<loc>https://developernetwork.net${path === "/" ? "/" : path}</loc>`,
            );
        }
    });

    test("advertises the posts and authors the API returned", async ({
        request,
    }) => {
        const xml = await (await request.get("/sitemap.xml")).text();

        expect(xml).toContain(
            `<loc>https://developernetwork.net/post/${STUB_POST_ID}</loc>`,
        );
        expect(xml).toContain(
            `<loc>https://developernetwork.net/profile/${STUB_POST_AUTHOR}</loc>`,
        );
        // The post's own date, not the day the sitemap was generated.
        expect(xml).toContain(`<lastmod>${STUB_POST_DATE}</lastmod>`);
    });
});
