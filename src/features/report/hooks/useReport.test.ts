import { act, renderHook } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../../tests/msw-server";

// useReport → reportApi → apiClient, which reads `localStorage` on every call.
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

import { useReport } from "./useReport";

const BASE = "http://localhost:8080/api/v1";

function captureBody() {
    const seen: Record<string, unknown>[] = [];
    server.use(
        http.post(`${BASE}/reports`, async ({ request }) => {
            seen.push((await request.json()) as Record<string, unknown>);
            return HttpResponse.json({ data: { received: true } });
        }),
    );
    return seen;
}

beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("access_token", "tok");
});

describe("useReport", () => {
    it("reports success once the server has taken it", async () => {
        captureBody();

        const { result } = renderHook(() => useReport());

        let sent: boolean | undefined;
        await act(async () => {
            sent = await result.current.submit(
                "POST",
                "post-1",
                "SPAM",
                "spam link",
            );
        });

        expect(sent).toBe(true);
        expect(result.current.error).toBeNull();
    });

    /*
     * `details` is validated as 1-500 characters *when present*, so an empty
     * string is a 400 rather than "no comment". The key has to be absent, and
     * an empty string is not dropped from a body the way `undefined` is.
     */
    it("omits the free text rather than sending it empty", async () => {
        const seen = captureBody();

        const { result } = renderHook(() => useReport());

        await act(async () => {
            await result.current.submit("POST", "post-1", "HATE", "   ");
        });

        expect(seen[0]).toEqual({
            targetKind: "POST",
            targetId: "post-1",
            reason: "HATE",
        });
        expect("details" in seen[0]).toBe(false);
    });

    it("trims the free text it does send", async () => {
        const seen = captureBody();

        const { result } = renderHook(() => useReport());

        await act(async () => {
            await result.current.submit(
                "COMMENT",
                "comment-1",
                "OTHER",
                "  a reason  ",
            );
        });

        expect(seen[0].details).toBe("a reason");
    });

    /*
     * Returned, not toasted: the dialog that produced it is still on screen
     * holding the reason and the text, and a toast over it would land beside
     * a form the person now has to fill in again.
     */
    it("surfaces a failure through the form rather than a toast", async () => {
        server.use(
            http.post(`${BASE}/reports`, () =>
                HttpResponse.json(
                    {
                        status: 404,
                        title: "NotFoundError",
                        detail: "Content not found.",
                    },
                    { status: 404 },
                ),
            ),
        );

        const { result } = renderHook(() => useReport());

        let sent: boolean | undefined;
        await act(async () => {
            sent = await result.current.submit("POST", "gone", "SPAM", "");
        });

        expect(sent).toBe(false);
        expect(result.current.error).toBe("Content not found.");
    });

    /*
     * Five a minute, and reporting is the kind of thing somebody does to
     * several posts in a row — this is the failure most likely to be seen, and
     * `getErrorMessage` answers it in the reader's own language rather than
     * showing the server's English.
     */
    it("answers a rate limit in the reader's language", async () => {
        server.use(
            http.post(`${BASE}/reports`, () =>
                HttpResponse.json(
                    {
                        status: 429,
                        title: "TooManyRequestsError",
                        detail: "Rate limit exceeded, retry in 1 minute.",
                    },
                    { status: 429 },
                ),
            ),
        );

        const { result } = renderHook(() => useReport());

        await act(async () => {
            await result.current.submit("POST", "post-1", "SPAM", "");
        });

        expect(result.current.error).not.toBe(
            "Rate limit exceeded, retry in 1 minute.",
        );
        expect(result.current.error).toBeTruthy();
    });

    it("clears a stale error when the dialog is reset", async () => {
        server.use(
            http.post(`${BASE}/reports`, () =>
                HttpResponse.json(
                    {
                        status: 404,
                        title: "NotFoundError",
                        detail: "Content not found.",
                    },
                    { status: 404 },
                ),
            ),
        );

        const { result } = renderHook(() => useReport());

        await act(async () => {
            await result.current.submit("POST", "gone", "SPAM", "");
        });
        expect(result.current.error).not.toBeNull();

        act(() => result.current.reset());

        expect(result.current.error).toBeNull();
    });
});
