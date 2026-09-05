import { beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../../tests/msw-server";

// `blockApi` reaches `apiClient`, which reads `localStorage` on every call.
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

import { blockApi } from "./block.api";

const BASE = "http://localhost:8080/api/v1";

beforeEach(() => {
    localStorage.clear();
});

describe("blockApi", () => {
    describe("the blocked list asks for a page", () => {
        function captureQuery(rows: unknown = []) {
            const seen: URLSearchParams[] = [];
            server.use(
                http.get(`${BASE}/blocks`, ({ request }) => {
                    seen.push(new URL(request.url).searchParams);
                    return HttpResponse.json({ data: rows });
                }),
            );
            return seen;
        }

        it("sends limit and offset by default", async () => {
            const seen = captureQuery();

            await blockApi.getBlocked();

            expect(seen[0].get("limit")).toBe("20");
            expect(seen[0].get("offset")).toBe("0");
        });

        it("carries an explicit offset through for the next page", async () => {
            const seen = captureQuery();

            await blockApi.getBlocked({ offset: 40 });

            expect(seen[0].get("offset")).toBe("40");
        });

        // The schema answers an out-of-range limit with a 400, and a list
        // rendering an error instead of people is worse than a short page.
        it("clamps a limit above the schema maximum", async () => {
            const seen = captureQuery();

            await blockApi.getBlocked({ limit: 500 });

            expect(seen[0].get("limit")).toBe("50");
        });

        it("clamps a limit below the schema minimum", async () => {
            const seen = captureQuery();

            await blockApi.getBlocked({ limit: 0 });

            expect(seen[0].get("limit")).toBe("1");
        });

        it("unwraps the rows out of the envelope", async () => {
            captureQuery([
                {
                    userId: "u-1",
                    username: "someone",
                    fullName: "Some One",
                    avatarUrl: "",
                    bio: null,
                },
            ]);

            const users = await blockApi.getBlocked();

            expect(users).toHaveLength(1);
            expect(users[0].username).toBe("someone");
        });
    });

    describe("block and unblock", () => {
        it("posts the target id", async () => {
            const bodies: unknown[] = [];
            server.use(
                http.post(`${BASE}/blocks`, async ({ request }) => {
                    bodies.push(await request.json());
                    return HttpResponse.json({ data: { isBlocked: true } });
                }),
            );

            const result = await blockApi.block("user-2");

            expect(bodies[0]).toEqual({ targetId: "user-2" });
            expect(result.isBlocked).toBe(true);
        });

        /*
         * `DELETE /blocks` reads its target from a body, which `fetch` will
         * send but does not encode for you — the same shape `profileApi
         * .unfollow` uses. Without the header the API reads no body at all
         * and answers 400.
         */
        it("sends the target id in the body of the delete", async () => {
            const bodies: unknown[] = [];
            const types: (string | null)[] = [];
            server.use(
                http.delete(`${BASE}/blocks`, async ({ request }) => {
                    types.push(request.headers.get("Content-Type"));
                    bodies.push(await request.json());
                    return HttpResponse.json({ data: { isBlocked: false } });
                }),
            );

            const result = await blockApi.unblock("user-2");

            expect(bodies[0]).toEqual({ targetId: "user-2" });
            expect(types[0]).toBe("application/json");
            expect(result.isBlocked).toBe(false);
        });
    });
});
