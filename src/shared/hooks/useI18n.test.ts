import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// `useLanguageStore` is persisted, and Zustand `persist` captures storage at
// module-evaluation time — the stub must exist before imports run.
vi.hoisted(() => {
    const store = new Map<string, string>();
    const localStorageMock: Storage = {
        getItem: (key) => store.get(key) ?? null,
        setItem: (key, value) => void store.set(key, String(value)),
        removeItem: (key) => void store.delete(key),
        clear: () => store.clear(),
        key: (index) => [...store.keys()][index] ?? null,
        get length() {
            return store.size;
        },
    };
    Object.defineProperty(globalThis, "localStorage", {
        value: localStorageMock,
        writable: true,
        configurable: true,
    });
});

import { useI18n } from "./useI18n";
import { useLanguageStore } from "../store/language.store";

beforeEach(() => {
    useLanguageStore.setState({ locale: "en" });
});

describe("useI18n", () => {
    it("translates using the current locale", () => {
        const { result } = renderHook(() => useI18n());

        expect(result.current.locale).toBe("en");
        expect(result.current.t("nav.home")).toBe("Home");
    });

    it("re-renders with Turkish strings when the locale changes", () => {
        const { result } = renderHook(() => useI18n());

        act(() => {
            useLanguageStore.getState().setLocale("tr");
        });

        expect(result.current.locale).toBe("tr");
        expect(result.current.t("nav.home")).toBe("Ana Sayfa");
    });

    it("returns a new t identity only when the locale changes", () => {
        const { result, rerender } = renderHook(() => useI18n());
        const first = result.current.t;

        rerender();
        expect(result.current.t).toBe(first);

        act(() => {
            useLanguageStore.getState().setLocale("tr");
        });
        expect(result.current.t).not.toBe(first);
    });

    it("interpolates vars", () => {
        const { result } = renderHook(() => useI18n());

        expect(result.current.t("notif.unread", { n: 5 })).toBe("5 unread");
    });
});
