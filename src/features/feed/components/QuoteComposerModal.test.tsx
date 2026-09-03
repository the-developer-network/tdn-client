import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../../tests/msw-server";

// The modal reaches `useAuthStore` (persist) and `apiClient`, both of which
// capture localStorage at module-evaluation time.
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

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual =
        await vi.importActual<typeof import("react-router-dom")>(
            "react-router-dom",
        );
    return { ...actual, useNavigate: () => mockNavigate };
});

import { useAuthStore } from "../../../core/auth/auth.store";
import { useToastStore } from "../../../shared/store/toast.store";
import type { QuotedPost } from "../api/feed.types";
import { QuoteComposerModal } from "./QuoteComposerModal";

const BASE = "http://localhost:8080/api/v1";

const quoted: QuotedPost = {
    isSensitive: false,
    mediaPending: false,
    id: "quoted-1",
    content: "the original take",
    mediaUrls: [],
    createdAt: "2026-08-29T10:00:00.000Z",
    author: {
        id: "u2",
        username: "veli",
        fullName: "Veli K.",
        avatarUrl: "https://cdn.example.com/avatars/veli.png",
    },
};

const createdQuote = {
    id: "new-quote",
    content: "buna katiliyorum",
    type: "COMMUNITY",
    mediaUrls: [],
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0,
    quoteCount: 0,
    isLiked: false,
    isBookmarked: false,
    author: { id: "u1", username: "ali", avatarUrl: "" },
    quotedPost: quoted,
};

beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState(useAuthStore.getInitialState());
    useToastStore.setState({ toasts: [] });
    mockNavigate.mockClear();
});

function renderModal(onQuoted = vi.fn(), onClose = vi.fn()) {
    render(
        <QuoteComposerModal
            isOpen
            onClose={onClose}
            quoted={quoted}
            onQuoted={onQuoted}
        />,
    );
    return { onQuoted, onClose };
}

describe("QuoteComposerModal", () => {
    it("previews the post being quoted", () => {
        renderModal();
        expect(screen.getByText("the original take")).toBeInTheDocument();
        expect(screen.getByText("@veli")).toBeInTheDocument();
    });

    it("posts the typed text together with quotedPostId", async () => {
        let body: Record<string, unknown> = {};
        server.use(
            http.post(`${BASE}/posts`, async ({ request }) => {
                body = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json({ data: createdQuote });
            }),
        );

        const { onQuoted } = renderModal();
        fireEvent.change(screen.getByPlaceholderText(/add a comment/i), {
            target: { value: "buna katiliyorum" },
        });
        fireEvent.click(screen.getByRole("button", { name: /^quote$/i }));

        await waitFor(() => expect(onQuoted).toHaveBeenCalled());
        expect(body).toMatchObject({
            content: "buna katiliyorum",
            quotedPostId: "quoted-1",
            type: "COMMUNITY",
        });
    });

    it("allows an empty body — that is a plain repost", async () => {
        let body: Record<string, unknown> = {};
        server.use(
            http.post(`${BASE}/posts`, async ({ request }) => {
                body = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json({
                    data: { ...createdQuote, content: "" },
                });
            }),
        );

        const { onQuoted, onClose } = renderModal();
        fireEvent.click(screen.getByRole("button", { name: /^quote$/i }));

        await waitFor(() => expect(onQuoted).toHaveBeenCalled());
        expect(body).toMatchObject({ content: "", quotedPostId: "quoted-1" });
        expect(onClose).toHaveBeenCalled();
    });

    it("hands the created post back so the list can show it before the cache expires", async () => {
        server.use(
            http.post(`${BASE}/posts`, () =>
                HttpResponse.json({ data: createdQuote }),
            ),
        );

        const { onQuoted } = renderModal();
        fireEvent.click(screen.getByRole("button", { name: /^quote$/i }));

        await waitFor(() =>
            expect(onQuoted).toHaveBeenCalledWith(
                expect.objectContaining({ id: "new-quote" }),
            ),
        );
    });

    it("blocks a body over the 300 character limit before it reaches the API", () => {
        let called = false;
        server.use(
            http.post(`${BASE}/posts`, () => {
                called = true;
                return HttpResponse.json({ data: createdQuote });
            }),
        );

        renderModal();
        fireEvent.change(screen.getByPlaceholderText(/add a comment/i), {
            target: { value: "x".repeat(301) },
        });

        const submit = screen.getByRole("button", { name: /^quote$/i });
        expect(submit).toBeDisabled();
        fireEvent.click(submit);
        expect(called).toBe(false);
    });

    // The example is deliberately not a 429 any more: `getErrorMessage`
    // translates that one by title, so it would prove the opposite of what
    // this case is about. A 4xx the client has no wording for still arrives in
    // the server's own words.
    it("toasts the API's own message when the create fails", async () => {
        server.use(
            http.post(`${BASE}/posts`, () =>
                HttpResponse.json(
                    {
                        type: "about:blank",
                        title: "QuotedPostNotFoundError",
                        status: 400,
                        detail: "The quoted post no longer exists.",
                    },
                    { status: 400 },
                ),
            ),
        );

        const { onQuoted } = renderModal();
        fireEvent.click(screen.getByRole("button", { name: /^quote$/i }));

        await waitFor(() =>
            expect(useToastStore.getState().toasts).toHaveLength(1),
        );
        const [toast] = useToastStore.getState().toasts;
        expect(toast.type).toBe("error");
        expect(toast.message).toContain("The quoted post no longer exists.");
        expect(onQuoted).not.toHaveBeenCalled();
    });
});
