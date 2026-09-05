import { beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../../tests/msw-server";

// `reportApi` reaches `apiClient`, which reads `localStorage` on every call.
vi.hoisted(() => {
    const _map = new Map<string, string>();
    vi.stubGlobal("localStorage", {
        getItem: (key: string) => _map.get(key) ?? null,
        setItem: (key: string, value: string) => {
            _map.set(key, String(value));
        },
        removeItem: (key: string) => {
            _map.delete(key);
        },
        clear: () => {
            _map.clear();
        },
        get length() {
            return _map.size;
        },
        key: (i: number) => [..._map.keys()][i] ?? null,
    });
});

import { reportApi } from "./report.api";

const BASE = "http://localhost:8080/api/v1";

/** Captures the body the client actually sent. */
function captureBody() {
    const seen: unknown[] = [];
    server.use(
        http.post(`${BASE}/reports`, async ({ request }) => {
            seen.push(await request.json());
            return HttpResponse.json({ data: { received: true } });
        }),
    );
    return seen;
}

beforeEach(() => {
    localStorage.clear();
});

describe("reportApi", () => {
    it("posts the target, its kind and the reason", async () => {
        const seen = captureBody();

        await reportApi.create({
            targetKind: "POST",
            targetId: "post-1",
            reason: "SPAM",
        });

        expect(seen[0]).toEqual({
            targetKind: "POST",
            targetId: "post-1",
            reason: "SPAM",
        });
    });

    it("carries the free text when there is one", async () => {
        const seen = captureBody();

        await reportApi.create({
            targetKind: "COMMENT",
            targetId: "comment-1",
            reason: "OTHER",
            details: "links to a phishing page",
        });

        expect(seen[0]).toEqual({
            targetKind: "COMMENT",
            targetId: "comment-1",
            reason: "OTHER",
            details: "links to a phishing page",
        });
    });

    it("unwraps the acknowledgement out of the envelope", async () => {
        captureBody();

        const result = await reportApi.create({
            targetKind: "POST",
            targetId: "post-1",
            reason: "HATE",
        });

        expect(result).toEqual({ received: true });
    });

    /*
     * The endpoint answers a repeat report exactly as it answers a first one,
     * so that it cannot be used to find out whether an earlier report was
     * acted on. Pinned here because a client that expected a different shape
     * the second time would be reading a signal the API refuses to give.
     */
    it("cannot tell a repeat report from a first one", async () => {
        captureBody();

        const first = await reportApi.create({
            targetKind: "POST",
            targetId: "post-1",
            reason: "SPAM",
        });
        const second = await reportApi.create({
            targetKind: "POST",
            targetId: "post-1",
            reason: "SPAM",
        });

        expect(second).toEqual(first);
    });
});
