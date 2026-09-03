import { renderHook, act } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../../tests/msw-server";

// `messageApi` reaches `apiClient`, which reads the token from localStorage as
// it evaluates.
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

import { useOpenConversation } from "./useOpenConversation";
import { useMessageStore } from "../store/message.store";
import { useAuthStore } from "../../../core/auth/auth.store";
import { useAuthModalStore } from "../../auth/store/auth-modal.store";
import { useToastStore } from "../../../shared/store/toast.store";

const BASE = "http://localhost:8080/api/v1";

const conversation = {
    id: "c1",
    status: "ACCEPTED",
    isRequest: false,
    canSend: true,
    participant: { id: "u2", username: "ayse", avatarUrl: "" },
    unreadCount: 0,
    lastMessagePreview: null,
    lastMessageAt: null,
    otherLastReadAt: null,
    createdAt: "2026-09-01T00:00:00.000Z",
};

beforeEach(() => {
    mockNavigate.mockClear();
    useMessageStore.setState(useMessageStore.getInitialState());
    useToastStore.setState(useToastStore.getInitialState());
    useAuthModalStore.setState(useAuthModalStore.getInitialState());
    useAuthStore.setState({
        user: { id: "u1", username: "me", isEmailVerified: true },
        token: null,
        isAuthenticated: true,
    });
});

describe("useOpenConversation", () => {
    it("opens the thread and goes to it", async () => {
        let body: unknown;
        server.use(
            http.post(`${BASE}/conversations`, async ({ request }) => {
                body = await request.json();
                return HttpResponse.json(
                    { data: conversation },
                    { status: 201 },
                );
            }),
        );

        const { result } = renderHook(() => useOpenConversation());
        await act(async () => {
            await result.current.open("u2");
        });

        expect(body).toEqual({ recipientId: "u2" });
        expect(mockNavigate).toHaveBeenCalledWith("/messages/c1");
        expect(useMessageStore.getState().conversations).toHaveLength(1);
    });

    /*
     * The regression. `JSON.stringify` drops a key whose value is `undefined`,
     * so a caller reading an id off a field the API does not send produced an
     * empty body — and the only thing the server could say back was that
     * `recipientId` was missing, which reads as a bug in the message body
     * rather than as a profile that never had an id.
     *
     * The real fix is at the call site, which now shares one derived id with
     * the follow button. This is the second line of defence: no request at all
     * beats a request that cannot succeed and misreports why.
     */
    it("sends nothing at all when there is no recipient", async () => {
        let called = false;
        server.use(
            http.post(`${BASE}/conversations`, () => {
                called = true;
                return HttpResponse.json(
                    { data: conversation },
                    { status: 201 },
                );
            }),
        );

        const { result } = renderHook(() => useOpenConversation());
        await act(async () => {
            await result.current.open("");
        });

        expect(called).toBe(false);
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("asks a signed-out reader to sign in rather than calling", async () => {
        useAuthStore.setState({
            user: null,
            token: null,
            isAuthenticated: false,
        });

        let called = false;
        server.use(
            http.post(`${BASE}/conversations`, () => {
                called = true;
                return HttpResponse.json(
                    { data: conversation },
                    { status: 201 },
                );
            }),
        );

        const { result } = renderHook(() => useOpenConversation());
        await act(async () => {
            await result.current.open("u2");
        });

        expect(called).toBe(false);
        expect(useAuthModalStore.getState().isOpen).toBe(true);
    });

    /*
     * `InvalidRecipientError` covers three cases with one status — yourself, a
     * bot, an account pending deletion — and the server writes which. Nothing
     * the client could add would be more specific, so the detail is shown.
     */
    it("shows what the server said about an invalid recipient", async () => {
        server.use(
            http.post(`${BASE}/conversations`, () =>
                HttpResponse.json(
                    {
                        type: "about:blank",
                        title: "InvalidRecipientError",
                        status: 400,
                        detail: "You cannot message yourself.",
                    },
                    { status: 400 },
                ),
            ),
        );

        const { result } = renderHook(() => useOpenConversation());
        await act(async () => {
            await result.current.open("u1");
        });

        expect(useToastStore.getState().toasts[0].message).toBe(
            "You cannot message yourself.",
        );
        expect(mockNavigate).not.toHaveBeenCalled();
    });
});
