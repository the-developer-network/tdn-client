import { beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../../tests/msw-server";

// `profileApi` reaches `apiClient`, which reads `localStorage` on every call.
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

import { profileApi } from "./profile.api";

const BASE = "http://localhost:8080/api/v1";

/** Captures the query string the client actually built. */
function captureQuery(path: string, body: unknown = []) {
    const seen: URLSearchParams[] = [];
    server.use(
        http.get(`${BASE}${path}`, ({ request }) => {
            seen.push(new URL(request.url).searchParams);
            return HttpResponse.json({ data: body });
        }),
    );
    return seen;
}

beforeEach(() => {
    localStorage.clear();
});

describe("profileApi", () => {
    // `/profiles/:username/followers` takes `PaginationQuerySchema`
    // — `limit` (default 20, max 50) and `offset` (default 0). Sending
    // neither leaves the server on its defaults, so a profile with more
    // than 20 followers is silently truncated to the first 20.
    describe("follower lists ask for a page", () => {
        it("sends limit and offset when fetching followers", async () => {
            const seen = captureQuery("/profiles/:username/followers");

            await profileApi.getFollowers("alice");

            expect(seen[0].get("limit")).toBe("20");
            expect(seen[0].get("offset")).toBe("0");
        });

        it("sends limit and offset when fetching following", async () => {
            const seen = captureQuery("/profiles/:username/following");

            await profileApi.getFollowing("alice");

            expect(seen[0].get("limit")).toBe("20");
            expect(seen[0].get("offset")).toBe("0");
        });

        it("carries an explicit offset through for the next page", async () => {
            const seen = captureQuery("/profiles/:username/followers");

            await profileApi.getFollowers("alice", { limit: 50, offset: 20 });

            expect(seen[0].get("limit")).toBe("50");
            expect(seen[0].get("offset")).toBe("20");
        });

        // The schema caps `limit` at 50; anything above is a 400, which the
        // list would render as an error instead of a page of followers.
        it("does not ask for more than the schema allows", async () => {
            const seen = captureQuery("/profiles/:username/followers");

            await profileApi.getFollowers("alice", { limit: 500 });

            expect(seen[0].get("limit")).toBe("50");
        });
    });

    describe("query strings that must keep working", () => {
        it("paginates user posts by page, as that endpoint's schema wants", async () => {
            const seen = captureQuery("/users/:username/posts");

            await profileApi.getUserPosts("alice", { page: 3, limit: 20 });

            expect(seen[0].get("page")).toBe("3");
            expect(seen[0].get("limit")).toBe("20");
        });

        it("encodes a search term", async () => {
            const seen = captureQuery("/profiles/search");

            await profileApi.searchProfiles("a b&c", 8);

            expect(seen[0].get("q")).toBe("a b&c");
            expect(seen[0].get("limit")).toBe("8");
        });

        it("unwraps the follower array out of the envelope", async () => {
            server.use(
                http.get(`${BASE}/profiles/:username/followers`, () =>
                    HttpResponse.json({
                        data: [{ userId: "u1", username: "bob" }],
                        meta: { limit: 20, offset: 0, count: 1 },
                    }),
                ),
            );

            await expect(profileApi.getFollowers("alice")).resolves.toEqual([
                { userId: "u1", username: "bob" },
            ]);
        });
    });
});
