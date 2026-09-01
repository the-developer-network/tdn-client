import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// `theme.store` persists, and `persist` captures storage as it evaluates.
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

import { useTheme } from "./useTheme";
import { useThemeStore } from "../store/theme.store";

function stubMatchMedia(prefersDark: boolean) {
    const listeners = new Set<() => void>();
    vi.stubGlobal(
        "matchMedia",
        vi.fn(() => ({
            matches: prefersDark,
            addEventListener: (_: string, fn: () => void) => listeners.add(fn),
            removeEventListener: (_: string, fn: () => void) =>
                listeners.delete(fn),
        })),
    );
    return listeners;
}

const themeAttr = () => document.documentElement.dataset.theme;

beforeEach(() => {
    vi.unstubAllGlobals();
    delete document.documentElement.dataset.theme;
    useThemeStore.setState({ theme: "dark" });
});

describe("useTheme", () => {
    it("stamps the theme on <html>, which is what the token overrides key off", () => {
        stubMatchMedia(true);
        renderHook(() => useTheme());
        expect(themeAttr()).toBe("dark");
    });

    it("restamps when the theme changes", () => {
        stubMatchMedia(true);
        const { result } = renderHook(() => useTheme());

        act(() => result.current.setTheme("light"));

        expect(themeAttr()).toBe("light");
        expect(result.current.theme).toBe("light");
    });

    it("resolves 'system' against the OS preference", () => {
        stubMatchMedia(false);
        useThemeStore.setState({ theme: "system" });

        renderHook(() => useTheme());

        expect(themeAttr()).toBe("light");
    });

    it("follows the OS while on 'system'", () => {
        const listeners = stubMatchMedia(true);
        useThemeStore.setState({ theme: "system" });
        renderHook(() => useTheme());
        expect(themeAttr()).toBe("dark");

        // The OS flips to light, and the same query now reports it.
        stubMatchMedia(false);
        act(() => listeners.forEach((fn) => fn()));

        expect(themeAttr()).toBe("light");
    });

    it("ignores the OS once a theme has been picked", () => {
        const listeners = stubMatchMedia(true);
        useThemeStore.setState({ theme: "light" });

        renderHook(() => useTheme());

        // An explicit choice outlives sunset: nothing is listening, so the
        // laptop switching to dark cannot take the reader's light theme away.
        expect(listeners.size).toBe(0);
        expect(themeAttr()).toBe("light");
    });

    it("drops its listener on unmount", () => {
        const listeners = stubMatchMedia(true);
        useThemeStore.setState({ theme: "system" });

        const { unmount } = renderHook(() => useTheme());
        expect(listeners.size).toBe(1);

        unmount();
        expect(listeners.size).toBe(0);
    });
});
