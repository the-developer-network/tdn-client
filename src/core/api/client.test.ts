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
});
