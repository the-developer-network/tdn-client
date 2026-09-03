import { act, renderHook } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../../tests/msw-server";

// useEditProfile reaches apiClient, which reads localStorage at runtime.
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

import type { Profile } from "../api/profile.types";
import { useEditProfile } from "./useEditProfile";

const BASE = "http://localhost:8080/api/v1";

const profile: Profile = {
    // `id`, as the API sends it. This fixture said `userId` for as long as the
    // type did, which is how a profile shape nothing returns went unnoticed.
    id: "user-1",
    username: "alice",
    fullName: "Alice",
    bio: "my bio",
    location: "Istanbul",
    avatarUrl: "",
    bannerUrl: "",
    socials: { github: "https://github.com/alice" },
    createdAt: "",
    updatedAt: "",
    followersCount: 0,
    postCount: 0,
    isMe: true,
    isFollowing: false,
};

/** Captures the PATCH body so assertions can inspect what was actually sent. */
function mockUpdate() {
    const captured: { body: Record<string, unknown> } = { body: {} };

    server.use(
        http.patch(`${BASE}/profiles/me`, async ({ request }) => {
            captured.body = (await request.json()) as Record<string, unknown>;
            return HttpResponse.json({ data: profile });
        }),
        http.get(`${BASE}/profiles/alice`, () =>
            HttpResponse.json({ data: profile }),
        ),
    );

    return captured;
}

function renderEditProfile() {
    return renderHook(() =>
        useEditProfile({ profile, username: "alice", onSuccess: vi.fn() }),
    );
}

beforeEach(() => {
    localStorage.clear();
});

describe("useEditProfile", () => {
    describe("clearing fields", () => {
        // The API clears on null and treats an omitted key as "unchanged", so
        // sending undefined for an emptied input made clearing impossible.
        it("sends null for a cleared bio", async () => {
            const captured = mockUpdate();
            const { result } = renderEditProfile();

            act(() => result.current.setBio(""));
            await act(async () => {
                await result.current.handleSubmit();
            });

            expect(Object.keys(captured.body)).toContain("bio");
            expect(captured.body.bio).toBeNull();
        });

        it("sends null for a cleared location", async () => {
            const captured = mockUpdate();
            const { result } = renderEditProfile();

            act(() => result.current.setLocation("   "));
            await act(async () => {
                await result.current.handleSubmit();
            });

            expect(captured.body.location).toBeNull();
        });

        it("clears socials by sending an empty record", async () => {
            const captured = mockUpdate();
            const { result } = renderEditProfile();

            act(() => result.current.removeSocial(0));
            await act(async () => {
                await result.current.handleSubmit();
            });

            expect(captured.body.socials).toEqual({});
        });
    });

    describe("normal edits", () => {
        it("sends the trimmed values that were entered", async () => {
            const captured = mockUpdate();
            const { result } = renderEditProfile();

            act(() => {
                result.current.setBio("  updated bio  ");
                result.current.setLocation("Ankara");
                result.current.setFullName("Alice Smith");
            });
            await act(async () => {
                await result.current.handleSubmit();
            });

            expect(captured.body).toMatchObject({
                bio: "updated bio",
                location: "Ankara",
                fullName: "Alice Smith",
            });
        });

        // fullName has minLength 2 and no null variant server-side, so an
        // emptied name is omitted rather than sent as a failing value.
        it("omits fullName when it is emptied", async () => {
            const captured = mockUpdate();
            const { result } = renderEditProfile();

            act(() => result.current.setFullName(""));
            await act(async () => {
                await result.current.handleSubmit();
            });

            expect(Object.keys(captured.body)).not.toContain("fullName");
        });
    });

    it("surfaces an error and stops loading when the update fails", async () => {
        server.use(
            http.patch(`${BASE}/profiles/me`, () => HttpResponse.error()),
        );
        const { result } = renderEditProfile();

        await act(async () => {
            await result.current.handleSubmit();
        });

        expect(result.current.error).toBeTruthy();
        expect(result.current.isLoading).toBe(false);
    });
});
