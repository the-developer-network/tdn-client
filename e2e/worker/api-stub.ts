/**
 * A stand-in for the TDN API, serving only the three endpoints the Worker
 * reads: post detail, profile detail, and the post list the sitemap is built
 * from. Playwright starts it as a webServer and `wrangler dev` is pointed at
 * it with `--var API_BASE`.
 *
 * Before this existed the `worker` project ran against the production API, so
 * every `/sitemap.xml` request in CI fetched three pages of one hundred real
 * posts, and the specs could only assert on tags whose *content* was whatever
 * production happened to hold that day. Everything here is fixed, so the specs
 * can assert the actual metadata the Worker produced.
 *
 * Run directly by Node (`node e2e/worker/api-stub.ts`) — the repo pins Node 26,
 * which strips the types itself.
 */

import { createServer } from "node:http";
import type { ServerResponse } from "node:http";

import {
    STUB_POST_AUTHOR,
    STUB_POST_DATE,
    STUB_POST_ID,
    stubPostContent,
    stubProfileName,
} from "./api-stub-data.ts";

const PORT = Number(process.env.STUB_API_PORT ?? 8789);

function json(res: ServerResponse, body: unknown, status = 200): void {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
        "content-type": "application/json;charset=UTF-8",
        "content-length": Buffer.byteLength(payload),
    });
    res.end(payload);
}

const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
    const path = url.pathname;

    // Probed by Playwright to decide the stub is up. Kept off /api/v1 so it
    // cannot be mistaken for something the real API serves.
    if (path === "/health") {
        json(res, { ok: true });
        return;
    }

    const postMatch = path.match(/^\/api\/v1\/posts\/([^/]+)$/);
    if (postMatch) {
        json(res, {
            data: {
                id: postMatch[1],
                content: stubPostContent(postMatch[1]),
                author: {
                    username: STUB_POST_AUTHOR,
                    fullName: "Stub Author",
                    avatarUrl: "",
                },
                mediaUrls: [],
            },
        });
        return;
    }

    const profileMatch = path.match(/^\/api\/v1\/profiles\/([^/]+)$/);
    if (profileMatch) {
        const username = decodeURIComponent(profileMatch[1]);
        json(res, {
            data: {
                username,
                fullName: stubProfileName(username),
                bio: `Stub bio for ${username}`,
                avatarUrl: "",
            },
        });
        return;
    }

    if (path === "/api/v1/posts") {
        // The Worker asks for pages 1-3; only the first has anything, which
        // also covers the empty-page path.
        const page = Number(url.searchParams.get("page") ?? "1");
        json(res, {
            data:
                page === 1
                    ? [
                          {
                              id: STUB_POST_ID,
                              createdAt: `${STUB_POST_DATE}T03:04:05.000Z`,
                              author: { username: STUB_POST_AUTHOR },
                          },
                      ]
                    : [],
        });
        return;
    }

    json(res, { error: `stub has no route for ${path}` }, 404);
});

server.listen(PORT, "127.0.0.1", () => {
    console.log(`e2e API stub listening on http://127.0.0.1:${PORT}`);
});
