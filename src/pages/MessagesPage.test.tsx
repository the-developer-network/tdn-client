import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../tests/msw-server";

// `messageApi` reaches `apiClient`, and `getErrorMessage` resolves its strings
// through the persisted language store — both capture storage as they load.
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

import { MemoryRouter } from "react-router-dom";
import { useAuthStore } from "../core/auth/auth.store";
import { useAuthModalStore } from "../features/auth/store/auth-modal.store";
import { useMessageStore } from "../features/messages/store/message.store";
import MessagesPage from "./MessagesPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual =
        await vi.importActual<typeof import("react-router-dom")>(
            "react-router-dom",
        );
    return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../shared/layout/PageShell", () => ({
    PageShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("../shared/components/TrendingTopicsWidget", () => ({
    TrendingTopicsWidget: () => null,
}));

const BASE = "http://localhost:8080/api/v1";

function row(id: string, overrides: Record<string, unknown> = {}) {
    return {
        id,
        status: "ACCEPTED",
        isRequest: false,
        canSend: true,
        participant: {
            id: "u2",
            username: "ayse",
            fullName: "Ayse Y.",
            avatarUrl: "",
        },
        unreadCount: 0,
        lastMessagePreview: "hello there",
        lastMessageAt: "2026-09-03T12:00:00.000Z",
        otherLastReadAt: null,
        createdAt: "2026-09-01T00:00:00.000Z",
        ...overrides,
    };
}

function listing(rows: unknown[]) {
    return HttpResponse.json({
        data: rows,
        meta: { timestamp: "t", nextCursor: null },
    });
}

function renderPage() {
    return render(
        <MemoryRouter>
            <MessagesPage />
        </MemoryRouter>,
    );
}

beforeEach(() => {
    mockNavigate.mockClear();
    useMessageStore.setState(useMessageStore.getInitialState());
    useAuthModalStore.setState(useAuthModalStore.getInitialState());
    useAuthStore.setState({
        user: { id: "u1", username: "me", isEmailVerified: true },
        token: null,
        isAuthenticated: true,
    });
});

describe("MessagesPage", () => {
    it("lists the accepted conversations", async () => {
        server.use(
            http.get(`${BASE}/conversations`, () => listing([row("c1")])),
        );

        renderPage();

        expect(await screen.findByText("Ayse Y.")).toBeInTheDocument();
        expect(screen.getByText("hello there")).toBeInTheDocument();
    });

    it("says so when there is nothing yet", async () => {
        server.use(http.get(`${BASE}/conversations`, () => listing([])));

        renderPage();

        expect(
            await screen.findByText("No conversations yet"),
        ).toBeInTheDocument();
    });

    it("switches to the requests tab and asks for the pending listing", async () => {
        const seen: (string | null)[] = [];
        server.use(
            http.get(`${BASE}/conversations`, ({ request }) => {
                const status = new URL(request.url).searchParams.get("status");
                seen.push(status);
                return listing(
                    status === "PENDING"
                        ? [row("r1", { status: "PENDING", isRequest: true })]
                        : [],
                );
            }),
        );

        renderPage();
        await screen.findByText("No conversations yet");

        await userEvent.click(screen.getByRole("button", { name: /Requests/ }));

        await waitFor(() => expect(seen).toContain("PENDING"));
        expect(await screen.findByText("Ayse Y.")).toBeInTheDocument();
    });

    /*
     * There is no unauthenticated read path on any of these endpoints, so this
     * is a hard guard rather than a degraded view.
     */
    it("sends a signed-out reader home and opens the sign-in modal", () => {
        useAuthStore.setState({
            user: null,
            token: null,
            isAuthenticated: false,
        });

        renderPage();

        expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
        expect(useAuthModalStore.getState().isOpen).toBe(true);
    });

    it("offers a retry when the listing fails", async () => {
        let fail = true;
        server.use(
            http.get(`${BASE}/conversations`, () => {
                if (fail) {
                    return HttpResponse.json(
                        {
                            type: "about:blank",
                            title: "InternalServerError",
                            status: 500,
                            detail: "An unexpected error occurred.",
                        },
                        { status: 500 },
                    );
                }
                return listing([row("c1")]);
            }),
        );

        renderPage();

        const retry = await screen.findByRole("button", {
            name: "Try again",
        });
        fail = false;
        await userEvent.click(retry);

        expect(await screen.findByText("Ayse Y.")).toBeInTheDocument();
    });
});
