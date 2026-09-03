import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../tests/msw-server";

// client.ts accesses localStorage lazily (inside function bodies), but the
// test's own beforeEach calls localStorage.clear(). jsdom does not ship a
// fully-functional Storage implementation, so we provide a Map-backed stub
// via vi.hoisted — which runs before any module is evaluated.
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

import { NetworkError } from "./api-types";
import { api, registerSessionExpiredHandler } from "./client";

const BASE = "http://localhost:8080/api/v1";

beforeEach(() => {
    localStorage.clear();
    // Provide a no-op handler so the module-level _onSessionExpired is never null
    registerSessionExpiredHandler(() => {});
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("apiClient", () => {
    describe("Authorization header", () => {
        it("sends a Bearer token when access_token is present in localStorage", async () => {
            localStorage.setItem("access_token", "my-token");
            let capturedAuth: string | null = null;

            server.use(
                http.get(`${BASE}/posts`, ({ request }) => {
                    capturedAuth = request.headers.get("Authorization");
                    return HttpResponse.json({ data: [] });
                }),
            );

            await api.get("/posts");
            expect(capturedAuth).toBe("Bearer my-token");
        });

        it("omits the Authorization header when no token is stored", async () => {
            let capturedAuth: string | null = "present"; // proves the handler ran

            server.use(
                http.get(`${BASE}/posts`, ({ request }) => {
                    capturedAuth = request.headers.get("Authorization");
                    return HttpResponse.json({ data: [] });
                }),
            );

            await api.get("/posts");
            expect(capturedAuth).toBeNull();
        });
    });

    describe("204 No Content", () => {
        it("returns an empty object for a 204 response without parsing a body", async () => {
            server.use(
                http.delete(
                    `${BASE}/posts/post-1`,
                    () => new HttpResponse(null, { status: 204 }),
                ),
            );

            const result = await api.delete("/posts/post-1");
            expect(result).toEqual({});
        });
    });

    describe("request timeout", () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
            // vi.restoreAllMocks() in the outer afterEach handles the fetch spy
        });

        it("throws a NetworkError with 'Request timed out' after 15 s of no response", async () => {
            // Spy on global fetch so vi.restoreAllMocks() in the outer afterEach
            // can restore it without touching any other stubbed globals (e.g. localStorage)
            vi.spyOn(globalThis, "fetch").mockImplementation(
                (
                    _url: RequestInfo | URL,
                    init?: RequestInit,
                ): Promise<Response> =>
                    new Promise<Response>((_resolve, reject) => {
                        init?.signal?.addEventListener("abort", () => {
                            reject(
                                new DOMException(
                                    "The user aborted a request.",
                                    "AbortError",
                                ),
                            );
                        });
                    }),
            );

            // Attach .catch immediately so the rejection is never unhandled
            const caught = api.get<unknown>("/posts").catch((e: unknown) => e);
            // Advance past the 15 000 ms timeout
            await vi.advanceTimersByTimeAsync(15_001);

            const result = await caught;
            expect(result).toBeInstanceOf(NetworkError);
            expect((result as NetworkError).message).toBe("Request timed out");
        });
    });

    // "An unexpected error occurred." was the only thing the app could say
    // when a body would not parse: a bare SyntaxError carries no status and no
    // title, so `getErrorMessage` had nothing to work with and the real HTTP
    // status never reached the caller.
    describe("unreadable response bodies", () => {
        it("reports the status when an error response carries no body", async () => {
            server.use(
                http.post(
                    `${BASE}/follows`,
                    () => new HttpResponse(null, { status: 500 }),
                ),
            );

            await expect(
                api.post("/follows", { targetId: "u1" }),
            ).rejects.toMatchObject({
                status: 500,
                detail: expect.stringContaining("empty body"),
            });
        });

        it("reports the status when an error response is not JSON", async () => {
            server.use(
                http.post(
                    `${BASE}/follows`,
                    () =>
                        new HttpResponse("<html>Bad Gateway</html>", {
                            status: 502,
                            headers: { "Content-Type": "text/html" },
                        }),
                ),
            );

            await expect(
                api.post("/follows", { targetId: "u1" }),
            ).rejects.toMatchObject({
                status: 502,
                detail: expect.stringContaining("not JSON"),
            });
        });

        it("still throws the problem document when the API sends one", async () => {
            server.use(
                http.post(`${BASE}/follows`, () =>
                    HttpResponse.json(
                        {
                            type: "about:blank",
                            title: "TooManyRequests",
                            status: 429,
                            detail: "Too many requests, please try again later.",
                        },
                        { status: 429 },
                    ),
                ),
            );

            await expect(
                api.post("/follows", { targetId: "u1" }),
            ).rejects.toMatchObject({
                status: 429,
                detail: "Too many requests, please try again later.",
            });
        });
    });

    describe("401 — token refresh queue", () => {
        it("retries the original request once after a successful token refresh", async () => {
            localStorage.setItem("access_token", "old-token");
            let callCount = 0;

            server.use(
                http.get(`${BASE}/posts`, () => {
                    callCount++;
                    if (callCount === 1)
                        return new HttpResponse(null, { status: 401 });
                    return HttpResponse.json({ data: [{ id: "post-1" }] });
                }),
                http.post(`${BASE}/auth/refresh`, () =>
                    HttpResponse.json({
                        data: {
                            accessToken: "new-token",
                            expiresAt: Date.now() + 3_600_000,
                        },
                    }),
                ),
            );

            // apiClient unwraps ApiResponse<T>.data — result is T, not ApiResponse<T>
            const result = await api.get<{ id: string }[]>("/posts");

            expect(callCount).toBe(2);
            expect(result).toEqual([{ id: "post-1" }]);
            expect(localStorage.getItem("access_token")).toBe("new-token");
        });

        it("makes exactly one refresh call when concurrent requests both receive 401", async () => {
            localStorage.setItem("access_token", "old-token");
            let postsCallCount = 0;
            let profileCallCount = 0;
            let refreshCount = 0;

            server.use(
                http.get(`${BASE}/posts`, () => {
                    postsCallCount++;
                    if (postsCallCount === 1)
                        return new HttpResponse(null, { status: 401 });
                    return HttpResponse.json({ data: [] });
                }),
                http.get(`${BASE}/profiles/me`, () => {
                    profileCallCount++;
                    if (profileCallCount === 1)
                        return new HttpResponse(null, { status: 401 });
                    return HttpResponse.json({ data: { userId: "user-1" } });
                }),
                http.post(`${BASE}/auth/refresh`, () => {
                    refreshCount++;
                    return HttpResponse.json({
                        data: {
                            accessToken: "new-token",
                            expiresAt: Date.now() + 3_600_000,
                        },
                    });
                }),
            );

            // apiClient unwraps ApiResponse<T>.data — each result is T, not ApiResponse<T>
            const [posts, profile] = await Promise.all([
                api.get<unknown[]>("/posts"),
                api.get<{ userId: string }>("/profiles/me"),
            ]);

            // Exactly one refresh despite two concurrent 401s
            expect(refreshCount).toBe(1);
            // Each endpoint: first call = 401, second call = success (via queue or direct retry)
            expect(postsCallCount).toBe(2);
            expect(profileCallCount).toBe(2);
            expect(Array.isArray(posts)).toBe(true);
            expect(profile).toMatchObject({ userId: "user-1" });
        });

        it("calls the session-expired handler and clears the token when refresh fails", async () => {
            localStorage.setItem("access_token", "expired-token");
            const onExpired = vi.fn();
            registerSessionExpiredHandler(onExpired);

            server.use(
                http.get(
                    `${BASE}/posts`,
                    () => new HttpResponse(null, { status: 401 }),
                ),
                http.post(
                    `${BASE}/auth/refresh`,
                    () => new HttpResponse(null, { status: 401 }),
                ),
            );

            await expect(api.get("/posts")).rejects.toThrow("Session Expired");
            expect(onExpired).toHaveBeenCalledOnce();
            expect(localStorage.getItem("access_token")).toBeNull();
        });
    });

    // The isPublic path retries without the Authorization header so the request
    // still resolves anonymously. That retry used to call fetch directly, which
    // skipped both the timeout and the NetworkError wrapping.
    describe("401 — isPublic anonymous retry", () => {
        it("returns the anonymous response when the retry succeeds", async () => {
            localStorage.setItem("access_token", "expired-token");
            let hit = 0;
            server.use(
                http.get(`${BASE}/posts`, () => {
                    hit += 1;
                    if (hit === 1)
                        return new HttpResponse(null, { status: 401 });
                    return HttpResponse.json({ data: [{ id: "public-1" }] });
                }),
                http.post(`${BASE}/auth/refresh`, () =>
                    HttpResponse.json({ data: { accessToken: "fresh" } }),
                ),
            );

            const result = await api.get<{ id: string }[]>("/posts", {
                isPublic: true,
            });

            expect(result).toEqual([{ id: "public-1" }]);
        });

        // Opening an article fires several public reads at once — the article,
        // its comments, the trending rail. With a stale token each one takes
        // this branch, and each used to call refresh directly, bypassing the
        // single-flight guard the authenticated path uses. Refresh is limited
        // to five a minute, and a rotating refresh token means the second and
        // third present one the first has already spent: they fail, and a
        // failed refresh signs the reader out.
        it("refreshes once for several concurrent public 401s", async () => {
            localStorage.setItem("access_token", "expired-token");
            let refreshes = 0;
            const seen = new Set<string>();

            server.use(
                http.get(`${BASE}/articles/:slug`, ({ request }) => {
                    const key = new URL(request.url).pathname;
                    if (!seen.has(key)) {
                        seen.add(key);
                        return new HttpResponse(null, { status: 401 });
                    }
                    return HttpResponse.json({ data: { id: "a" } });
                }),
                http.post(`${BASE}/auth/refresh`, async () => {
                    refreshes += 1;
                    await new Promise((resolve) => setTimeout(resolve, 20));
                    return HttpResponse.json({
                        data: { accessToken: "fresh" },
                    });
                }),
            );

            await Promise.all([
                api.get("/articles/one", { isPublic: true }),
                api.get("/articles/two", { isPublic: true }),
                api.get("/articles/three", { isPublic: true }),
            ]);
            await new Promise((resolve) => setTimeout(resolve, 60));

            expect(refreshes).toBe(1);
        });

        // A reader who never signed in has no session to renew. Asking anyway
        // spends a request and then reports the session as expired, which
        // opens the sign-in modal at someone who never signed in.
        it("does not try to refresh when no token was sent", async () => {
            let refreshes = 0;
            const onExpired = vi.fn();
            registerSessionExpiredHandler(onExpired);

            server.use(
                http.get(
                    `${BASE}/articles`,
                    () => new HttpResponse(null, { status: 401 }),
                ),
                http.post(`${BASE}/auth/refresh`, () => {
                    refreshes += 1;
                    return new HttpResponse(null, { status: 401 });
                }),
            );

            await api.get("/articles", { isPublic: true }).catch(() => {});
            await new Promise((resolve) => setTimeout(resolve, 40));

            expect(refreshes).toBe(0);
            expect(onExpired).not.toHaveBeenCalled();
        });

        it("reports a dropped connection on the retry as a NetworkError", async () => {
            localStorage.setItem("access_token", "expired-token");
            let hit = 0;
            server.use(
                http.get(`${BASE}/posts`, () => {
                    hit += 1;
                    if (hit === 1)
                        return new HttpResponse(null, { status: 401 });
                    return HttpResponse.error();
                }),
                http.post(`${BASE}/auth/refresh`, () =>
                    HttpResponse.json({ data: { accessToken: "fresh" } }),
                ),
            );

            const result = await api
                .get("/posts", { isPublic: true })
                .catch((e: unknown) => e);

            // A raw TypeError here would surface to the user as "an unexpected
            // error" rather than a connection problem.
            expect(result).toBeInstanceOf(NetworkError);
        });

        it("times out the retry instead of hanging forever", async () => {
            vi.useFakeTimers();
            localStorage.setItem("access_token", "expired-token");

            let call = 0;
            vi.spyOn(globalThis, "fetch").mockImplementation(
                (
                    _url: RequestInfo | URL,
                    init?: RequestInit,
                ): Promise<Response> => {
                    call += 1;
                    if (call === 1) {
                        return Promise.resolve(
                            new Response(null, { status: 401 }),
                        );
                    }
                    return new Promise<Response>((_resolve, reject) => {
                        init?.signal?.addEventListener("abort", () =>
                            reject(
                                new DOMException(
                                    "The user aborted a request.",
                                    "AbortError",
                                ),
                            ),
                        );
                    });
                },
            );

            let settled = false;
            const caught = api.get<unknown>("/posts", { isPublic: true }).then(
                (value) => {
                    settled = true;
                    return value;
                },
                (err: unknown) => {
                    settled = true;
                    return err;
                },
            );

            await vi.advanceTimersByTimeAsync(15_001);

            expect(settled).toBe(true);
            expect(await caught).toBeInstanceOf(NetworkError);

            vi.useRealTimers();
        });
    });
});

/**
 * `api.get` unwraps `ApiResponse.data` and drops `meta` with it. That is right
 * for everything paged by `page`/`limit`, and fatal for a cursor-paginated
 * listing: the cursor that reaches the next page lives in `meta`, so
 * unwrapping leaves no way to walk a conversation backwards at all.
 */
describe("api.getPage", () => {
    it("hands back the whole envelope, cursor included", async () => {
        server.use(
            http.get(`${BASE}/conversations`, () =>
                HttpResponse.json({
                    data: [{ id: "c1" }],
                    meta: { timestamp: "t", nextCursor: "opaque-cursor" },
                }),
            ),
        );

        const page = await api.getPage<{ id: string }[]>("/conversations");

        expect(page.data).toEqual([{ id: "c1" }]);
        expect(page.meta?.nextCursor).toBe("opaque-cursor");
    });

    it("reports the end of a listing as a null cursor", async () => {
        server.use(
            http.get(`${BASE}/conversations`, () =>
                HttpResponse.json({
                    data: [],
                    meta: { timestamp: "t", nextCursor: null },
                }),
            ),
        );

        const page = await api.getPage<unknown[]>("/conversations");

        expect(page.meta?.nextCursor).toBeNull();
    });

    // The envelope option changes what is returned, not how failures are
    // reported: the problem document still reaches the caller untouched.
    it("still throws the problem document on an error", async () => {
        server.use(
            http.get(`${BASE}/conversations/x/messages`, () =>
                HttpResponse.json(
                    {
                        type: "about:blank",
                        title: "ConversationNotFoundError",
                        status: 404,
                        detail: "No such conversation.",
                    },
                    { status: 404 },
                ),
            ),
        );

        await expect(
            api.getPage<unknown>("/conversations/x/messages"),
        ).rejects.toMatchObject({
            title: "ConversationNotFoundError",
            status: 404,
        });
    });

    it("leaves api.get unwrapping as it was", async () => {
        server.use(
            http.get(`${BASE}/conversations/unread-count`, () =>
                HttpResponse.json({
                    data: { count: 3 },
                    meta: { timestamp: "t" },
                }),
            ),
        );

        await expect(
            api.get<{ count: number }>("/conversations/unread-count"),
        ).resolves.toEqual({ count: 3 });
    });
});
