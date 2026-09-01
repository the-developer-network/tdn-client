import { beforeEach, describe, expect, it, vi } from "vitest";

// `persist` reads localStorage as the module evaluates, and jsdom 29's
// `Storage.clear()` does not work, so the stub has to exist before the import
// below runs.
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

import {
    resolveTheme,
    systemPrefersDark,
    useThemeStore,
    watchSystemTheme,
} from "./theme.store";

/** A `matchMedia` that reports the OS preference the test asks for. */
function stubMatchMedia(prefersDark: boolean) {
    const listeners = new Set<() => void>();
    const query = {
        matches: prefersDark,
        addEventListener: (_: string, fn: () => void) => listeners.add(fn),
        removeEventListener: (_: string, fn: () => void) =>
            listeners.delete(fn),
    };
    const matchMedia = vi.fn(() => query);
    vi.stubGlobal("matchMedia", matchMedia);
    return { matchMedia, listeners, query };
}

beforeEach(() => {
    vi.unstubAllGlobals();
    useThemeStore.setState({ theme: "dark" });
});

describe("useThemeStore", () => {
    it("starts dark, so an account that never opened settings reads what it always read", () => {
        expect(useThemeStore.getInitialState().theme).toBe("dark");
    });

    it("records the chosen theme", () => {
        useThemeStore.getState().setTheme("light");
        expect(useThemeStore.getState().theme).toBe("light");
    });
});

describe("resolveTheme", () => {
    it("passes an explicit choice straight through", () => {
        stubMatchMedia(true);
        expect(resolveTheme("light")).toBe("light");
        expect(resolveTheme("dark")).toBe("dark");
    });

    it("reads the OS preference for 'system'", () => {
        stubMatchMedia(false);
        expect(resolveTheme("system")).toBe("light");

        stubMatchMedia(true);
        expect(resolveTheme("system")).toBe("dark");
    });

    it("asks the OS only when it has to", () => {
        const { matchMedia } = stubMatchMedia(true);
        resolveTheme("light");
        expect(matchMedia).not.toHaveBeenCalled();
    });
});

describe("systemPrefersDark", () => {
    /*
     * Not a hypothetical: jsdom leaves `matchMedia` undefined, so an unguarded
     * call here would fail every test whose module graph reaches this file —
     * which, through `useTheme` and `AppInit`, is most of them.
     */
    it("falls back to dark where matchMedia does not exist", () => {
        vi.stubGlobal("matchMedia", undefined);
        expect(systemPrefersDark()).toBe(true);
    });
});

describe("watchSystemTheme", () => {
    it("calls back when the OS preference changes, and stops once unsubscribed", () => {
        const { listeners } = stubMatchMedia(true);
        const onChange = vi.fn();

        const unsubscribe = watchSystemTheme(onChange);
        expect(listeners.size).toBe(1);

        listeners.forEach((fn) => fn());
        expect(onChange).toHaveBeenCalledTimes(1);

        unsubscribe();
        expect(listeners.size).toBe(0);
    });

    it("returns a usable unsubscribe where matchMedia does not exist", () => {
        vi.stubGlobal("matchMedia", undefined);
        expect(() => watchSystemTheme(vi.fn())()).not.toThrow();
    });
});
