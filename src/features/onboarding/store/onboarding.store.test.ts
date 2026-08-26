import { beforeEach, describe, expect, it, vi } from "vitest";

// Zustand's `persist` captures storage at module-evaluation time and jsdom
// 29's `Storage.clear()` is broken, so the stub has to exist before the import.
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

import { useOnboardingStore } from "./onboarding.store";

beforeEach(() => {
    localStorage.clear();
    useOnboardingStore.getState().reset();
});

describe("useOnboardingStore", () => {
    it("reports an unknown user as not onboarded", () => {
        expect(useOnboardingStore.getState().isCompleted("user-1")).toBe(false);
    });

    it("records the user and the fields they picked", () => {
        useOnboardingStore.getState().complete("user-1", ["BACKEND", "AI"]);

        expect(useOnboardingStore.getState().isCompleted("user-1")).toBe(true);
        expect(useOnboardingStore.getState().interests).toEqual([
            "BACKEND",
            "AI",
        ]);
    });

    // A shared browser must not let a second account inherit the first one's
    // completion, which is why this is a list of ids and not a boolean.
    it("keeps completion per user", () => {
        useOnboardingStore.getState().complete("user-1", ["BACKEND"]);

        expect(useOnboardingStore.getState().isCompleted("user-2")).toBe(false);
    });

    it("does not record the same user twice", () => {
        useOnboardingStore.getState().complete("user-1", ["BACKEND"]);
        useOnboardingStore.getState().complete("user-1", ["FRONTEND"]);

        expect(useOnboardingStore.getState().completedUserIds).toEqual([
            "user-1",
        ]);
    });

    // The gate calls `complete(userId, [])` when the server says the account
    // already follows people. That path must not erase a real pick.
    it("leaves stored interests alone when completed with an empty pick", () => {
        useOnboardingStore.getState().complete("user-1", ["BACKEND"]);
        useOnboardingStore.getState().complete("user-2", []);

        expect(useOnboardingStore.getState().interests).toEqual(["BACKEND"]);
    });

    it("persists under tdn-onboarding", () => {
        useOnboardingStore.getState().complete("user-1", ["MOBILE"]);

        const raw = localStorage.getItem("tdn-onboarding");
        expect(raw).not.toBeNull();
        expect(JSON.parse(raw as string).state.completedUserIds).toEqual([
            "user-1",
        ]);
    });
});
