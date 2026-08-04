import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../../tests/msw-server";

// `authApi` reaches `apiClient`, which reads `localStorage` on every request.
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

import { registerSessionExpiredHandler } from "../../../core/api/client";
import { authApi } from "./auth-api";

const BASE = "http://localhost:8080/api/v1";

/** The API reports errors as RFC 7807 problem documents. */
function problem(detail: string, status: number, title = "UnauthorizedError") {
    return HttpResponse.json(
        { type: "about:blank", title, status, detail, instance: "/" },
        { status },
    );
}

/**
 * Counts every request the client makes, so a silent replay is visible.
 * `/auth/refresh` is counted too: the credential endpoints must never
 * reach for a session they were called precisely because there isn't one.
 */
function countRequests() {
    const counts: Record<string, number> = {};
    server.events.on("request:start", ({ request }) => {
        const path = new URL(request.url).pathname;
        counts[path] = (counts[path] ?? 0) + 1;
    });
    return counts;
}

let sessionExpired: ReturnType<typeof vi.fn>;

beforeEach(() => {
    localStorage.clear();
    sessionExpired = vi.fn();
    registerSessionExpiredHandler(sessionExpired);
});

afterEach(() => {
    server.events.removeAllListeners();
    vi.restoreAllMocks();
});

describe("authApi", () => {
    describe("a 401 is the endpoint's own answer, not an expired session", () => {
        // `/auth/login` is rate limited STRICT — 3 attempts per 15 minutes,
        // `continueExceeding`. Sending each attempt twice halves that budget,
        // so a user who mistypes their password twice is locked out.
        it("sends a rejected login once, not twice", async () => {
            const counts = countRequests();
            server.use(
                http.post(`${BASE}/auth/login`, () =>
                    problem("Invalid credentials.", 401),
                ),
            );

            await expect(
                authApi.login("alice", "wrong-password"),
            ).rejects.toMatchObject({ detail: "Invalid credentials." });

            expect(counts["/api/v1/auth/login"]).toBe(1);
        });

        // The replay is followed by a background refresh. It fails — there is
        // no session to refresh — and the failure runs the session-expired
        // handler, which reopens the modal at the `identifier` step. A user
        // who mistypes their password is thrown back to the email screen and
        // the message explaining why never survives to be read.
        it("does not report the session as expired when a login is refused", async () => {
            const counts = countRequests();
            server.use(
                http.post(`${BASE}/auth/login`, () =>
                    problem("Invalid credentials.", 401),
                ),
                http.post(`${BASE}/auth/refresh`, () =>
                    problem("No refresh token.", 401),
                ),
            );

            await expect(
                authApi.login("alice", "wrong-password"),
            ).rejects.toMatchObject({ status: 401 });

            // The background refresh is fire-and-forget, so give it the tick
            // it would need to land before declaring it never happened.
            await vi.waitFor(() => {
                expect(counts["/api/v1/auth/login"]).toBe(1);
            });
            expect(counts["/api/v1/auth/refresh"]).toBeUndefined();
            expect(sessionExpired).not.toHaveBeenCalled();
        });

        // Same shape, reached from the recovery screen: `/auth/recover-account`
        // answers 401 when the token is invalid or expired.
        it("sends an invalid recovery token once, not twice", async () => {
            const counts = countRequests();
            server.use(
                http.post(`${BASE}/auth/recover-account`, () =>
                    problem("Invalid token purpose.", 401),
                ),
            );

            await expect(
                authApi.recoverAccount("stale-token"),
            ).rejects.toMatchObject({ detail: "Invalid token purpose." });

            expect(counts["/api/v1/auth/recover-account"]).toBe(1);
        });

        // A stale token from a previous session is not a credential for these
        // endpoints, and sending it invites the server to answer about the
        // wrong subject entirely.
        it("does not attach a leftover access token to a login", async () => {
            localStorage.setItem("access_token", "stale-token");
            // Every attempt is recorded, not just the last: the replay strips
            // the header itself, so checking one value would report the
            // stripped retry and miss the request that carried the token.
            const sent: (string | null)[] = [];
            server.use(
                http.post(`${BASE}/auth/login`, ({ request }) => {
                    sent.push(request.headers.get("Authorization"));
                    return problem("Invalid credentials.", 401);
                }),
            );

            await expect(authApi.login("alice", "nope")).rejects.toBeDefined();
            expect(sent).toEqual([null]);
        });
    });

    describe("contracts that must keep working", () => {
        it("propagates the problem detail so the view can render it", async () => {
            server.use(
                http.post(`${BASE}/auth/login`, () =>
                    problem("Your account is locked.", 401),
                ),
            );

            await expect(authApi.login("alice", "nope")).rejects.toMatchObject({
                status: 401,
                detail: "Your account is locked.",
            });
        });

        it("unwraps a successful login", async () => {
            server.use(
                http.post(`${BASE}/auth/login`, () =>
                    HttpResponse.json({
                        data: {
                            accessToken: "token-1",
                            expiresAt: 1_800,
                            user: {
                                id: "u1",
                                username: "alice",
                                isEmailVerified: true,
                            },
                        },
                    }),
                ),
            );

            await expect(
                authApi.login("alice", "right"),
            ).resolves.toMatchObject({ accessToken: "token-1" });
        });

        // `sendVerification` runs after `setAuth`, so it is a genuinely
        // authenticated call and must keep both the header and the refresh.
        it("still authenticates send-verification", async () => {
            localStorage.setItem("access_token", "live-token");
            let auth: string | null = null;
            server.use(
                http.post(`${BASE}/auth/send-verification`, ({ request }) => {
                    auth = request.headers.get("Authorization");
                    return new HttpResponse(null, { status: 204 });
                }),
            );

            await authApi.sendVerification();
            expect(auth).toBe("Bearer live-token");
        });
    });
});
