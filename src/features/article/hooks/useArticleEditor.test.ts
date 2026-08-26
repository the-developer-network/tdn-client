import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../../tests/msw-server";

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

import { useArticleEditor } from "./useArticleEditor";
import type { Article } from "../api/article.types";

const BASE = "http://localhost:8080/api/v1";

const article = (overrides: Partial<Article> = {}): Article => ({
    id: "article-1",
    slug: "my-article",
    title: "My Article",
    excerpt: "An excerpt.",
    body: "Body text.",
    coverImageUrl: null,
    coverImageAlt: null,
    readingTimeMinutes: 2,
    likeCount: 0,
    commentCount: 0,
    isLiked: false,
    isBookmarked: false,
    status: "DRAFT",
    publishedAt: null,
    createdAt: new Date().toISOString(),
    author: { id: "user-1", username: "testuser", avatarUrl: "" },
    tags: [],
    categories: [],
    ...overrides,
});

/** Records every write so request bodies can be asserted, not assumed. */
function recordWrites() {
    const creates: unknown[] = [];
    const updates: unknown[] = [];
    const uploads: number[] = [];

    server.use(
        http.post(`${BASE}/articles`, async ({ request }) => {
            creates.push(await request.json());
            return HttpResponse.json({ data: article() });
        }),
        http.patch(`${BASE}/articles/:id`, async ({ request }) => {
            updates.push(await request.json());
            return HttpResponse.json({ data: article() });
        }),
        http.post(`${BASE}/articles/cover`, () => {
            uploads.push(1);
            return HttpResponse.json({
                data: {
                    coverImageKey: "articles/covers/user-1/abc.png",
                    coverImageUrl: "https://cdn.example.com/abc.png",
                },
            });
        }),
        http.post(`${BASE}/articles/:id/publish`, () =>
            HttpResponse.json({
                data: article({ status: "PUBLISHED", slug: "my-article" }),
            }),
        ),
    );

    return { creates, updates, uploads };
}

const type = (
    result: { current: ReturnType<typeof useArticleEditor> },
    title: string,
    body: string,
) => {
    act(() => {
        result.current.update("title", title);
    });
    act(() => {
        result.current.update("body", body);
    });
};

beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
    vi.useRealTimers();
});

const flushAutosave = async () => {
    await act(async () => {
        vi.advanceTimersByTime(2500);
    });
};

describe("useArticleEditor", () => {
    it("cannot save until there is both a title and a body", async () => {
        const { creates } = recordWrites();
        const { result } = renderHook(() => useArticleEditor(null));

        expect(result.current.canSave).toBe(false);

        act(() => {
            result.current.update("title", "Only a title");
        });
        expect(result.current.canSave).toBe(false);

        await flushAutosave();
        // Creation requires both fields, so firing early would only 400.
        expect(creates).toHaveLength(0);

        act(() => {
            result.current.update("body", "And a body.");
        });
        expect(result.current.canSave).toBe(true);
    });

    it("creates a draft on the first autosave", async () => {
        const { creates } = recordWrites();
        const { result } = renderHook(() => useArticleEditor(null));

        type(result, "My Article", "Body text.");
        await flushAutosave();

        await waitFor(() => expect(creates).toHaveLength(1));
        expect(creates[0]).toMatchObject({
            title: "My Article",
            body: "Body text.",
        });
        expect(result.current.saveState).toBe("saved");
        expect(result.current.articleId).toBe("article-1");
    });

    // Creation is rate limited to five a minute, updates to sixty. Creating
    // twice would also orphan the first draft.
    it("creates once and updates thereafter", async () => {
        const { creates, updates } = recordWrites();
        const { result } = renderHook(() => useArticleEditor(null));

        type(result, "My Article", "Body text.");
        await flushAutosave();
        await waitFor(() => expect(creates).toHaveLength(1));

        act(() => {
            result.current.update("body", "Body text, revised.");
        });
        await flushAutosave();

        await waitFor(() => expect(updates).toHaveLength(1));
        expect(creates).toHaveLength(1);
    });

    it("does not save again when nothing changed", async () => {
        const { creates, updates } = recordWrites();
        const { result } = renderHook(() => useArticleEditor(null));

        type(result, "My Article", "Body text.");
        await flushAutosave();
        await waitFor(() => expect(creates).toHaveLength(1));

        await flushAutosave();
        await flushAutosave();

        expect(updates).toHaveLength(0);
    });

    // An edit made while a save is in flight must not be dropped. The save
    // captures the draft as it was when it started, and nothing re-runs the
    // autosave effect afterwards, so without an explicit follow-up the newer
    // text is never sent and the writer loses it with no error shown.
    it("saves again for an edit made while a save was in flight", async () => {
        let releaseCreate: (() => void) | null = null;
        const bodies: string[] = [];

        server.use(
            http.post(`${BASE}/articles`, async ({ request }) => {
                const json = (await request.json()) as { body: string };
                bodies.push(json.body);
                await new Promise<void>((resolve) => {
                    releaseCreate = resolve;
                });
                return HttpResponse.json({ data: article() });
            }),
            http.patch(`${BASE}/articles/:id`, async ({ request }) => {
                const json = (await request.json()) as { body: string };
                bodies.push(json.body);
                return HttpResponse.json({ data: article() });
            }),
        );

        const { result } = renderHook(() => useArticleEditor(null));
        type(result, "My Article", "First version.");
        await flushAutosave();
        await waitFor(() => expect(bodies).toHaveLength(1));

        // Typed while the create is still open.
        act(() => {
            result.current.update("body", "Second version.");
        });
        await flushAutosave();

        await act(async () => {
            releaseCreate?.();
            await new Promise((resolve) => setTimeout(resolve, 50));
        });
        await flushAutosave();

        await waitFor(() => expect(bodies).toContain("Second version."));
        expect(result.current.isDirty).toBe(false);
    });

    it("reports a failed save and keeps the text dirty", async () => {
        server.use(
            http.post(`${BASE}/articles`, () =>
                HttpResponse.json(
                    {
                        type: "about:blank",
                        title: "TooManyRequests",
                        status: 429,
                        detail: "Slow down.",
                        instance: "/api/v1/articles",
                    },
                    { status: 429 },
                ),
            ),
        );
        const { result } = renderHook(() => useArticleEditor(null));

        type(result, "My Article", "Body text.");
        await flushAutosave();

        await waitFor(() => expect(result.current.saveState).toBe("error"));
        expect(result.current.saveError).toBe("Slow down.");
        // Nothing reached the server, so the work is still unsaved.
        expect(result.current.isDirty).toBe(true);
    });

    describe("the cover", () => {
        const file = () => new File(["x"], "cover.png", { type: "image/png" });

        // The upload endpoint allows five a minute. Uploading on every
        // autosave would spend that in three keystroke pauses.
        it("uploads a chosen file once, however many saves follow", async () => {
            const { uploads, updates } = recordWrites();
            const { result } = renderHook(() => useArticleEditor(null));

            type(result, "My Article", "Body text.");
            act(() => {
                result.current.setCoverFile(file());
            });
            await flushAutosave();
            await waitFor(() => expect(uploads).toHaveLength(1));

            act(() => {
                result.current.update("body", "Revised once.");
            });
            await flushAutosave();
            act(() => {
                result.current.update("body", "Revised twice.");
            });
            await flushAutosave();

            await waitFor(() => expect(updates.length).toBeGreaterThan(0));
            expect(uploads).toHaveLength(1);
        });

        // `undefined` leaves the cover alone, `null` erases it. Collapsing the
        // two would make removing a cover impossible.
        it("omits coverImageKey entirely when the cover did not change", async () => {
            const { updates } = recordWrites();
            const { result } = renderHook(() =>
                useArticleEditor(
                    article({ coverImageUrl: "https://cdn.example.com/a.png" }),
                ),
            );

            act(() => {
                result.current.update("body", "Revised.");
            });
            await flushAutosave();

            await waitFor(() => expect(updates).toHaveLength(1));
            expect(updates[0]).not.toHaveProperty("coverImageKey");
        });

        it("sends null to clear a cover the article had", async () => {
            const { updates } = recordWrites();
            const { result } = renderHook(() =>
                useArticleEditor(
                    article({ coverImageUrl: "https://cdn.example.com/a.png" }),
                ),
            );

            act(() => {
                result.current.removeExistingCover();
            });
            await flushAutosave();

            await waitFor(() => expect(updates).toHaveLength(1));
            expect(updates[0]).toMatchObject({ coverImageKey: null });
        });
    });

    describe("publish", () => {
        it("saves outstanding text before publishing it", async () => {
            const { creates } = recordWrites();
            const { result } = renderHook(() => useArticleEditor(null));

            type(result, "My Article", "Body text.");

            // Published straight away, without waiting for the autosave timer.
            await act(async () => {
                await result.current.publish();
            });

            expect(creates).toHaveLength(1);
            expect(result.current.status).toBe("PUBLISHED");
        });

        // Publishing over a failed save would put the older text live and
        // silently discard what is on screen.
        it("refuses to publish when the save failed", async () => {
            server.use(
                http.post(`${BASE}/articles`, () =>
                    HttpResponse.json(
                        {
                            type: "about:blank",
                            title: "InternalServerError",
                            status: 500,
                            detail: "Nope.",
                            instance: "/api/v1/articles",
                        },
                        { status: 500 },
                    ),
                ),
            );
            let published = false;
            server.use(
                http.post(`${BASE}/articles/:id/publish`, () => {
                    published = true;
                    return HttpResponse.json({ data: article() });
                }),
            );

            const { result } = renderHook(() => useArticleEditor(null));
            type(result, "My Article", "Body text.");

            await act(async () => {
                await result.current.publish();
            });

            expect(published).toBe(false);
            expect(result.current.saveState).toBe("error");
        });
    });
});
