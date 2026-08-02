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

import { translate, translateWith } from "./translate";
import { translations } from "./translations";
import { useLanguageStore } from "../store/language.store";

beforeEach(() => {
    useLanguageStore.setState({ locale: "en" });
});

describe("translateWith", () => {
    it("returns the string for the requested locale", () => {
        expect(translateWith("en", "nav.home")).toBe("Home");
        expect(translateWith("tr", "nav.home")).toBe("Ana Sayfa");
    });

    it("interpolates {{var}} placeholders", () => {
        expect(translateWith("en", "notif.follow", { username: "ada" })).toBe(
            "@ada started following you",
        );
        expect(translateWith("tr", "notif.follow", { username: "ada" })).toBe(
            "@ada sizi takip etmeye başladı",
        );
    });

    it("interpolates numeric values", () => {
        expect(translateWith("en", "notif.unread", { n: 3 })).toBe("3 unread");
    });

    it("leaves a placeholder verbatim when no matching var is supplied", () => {
        expect(translateWith("en", "notif.unread", { other: 1 })).toBe(
            "{{n}} unread",
        );
    });

    it("returns the string untouched when no vars are passed", () => {
        expect(translateWith("en", "notif.unread")).toBe("{{n}} unread");
    });

    it("falls back to the raw key when the key is absent from both locales", () => {
        const result = translateWith(
            "tr",
            "does.not.exist" as keyof typeof translations.en,
        );
        expect(result).toBe("does.not.exist");
    });
});

describe("translate", () => {
    it("reads the current locale from the language store", () => {
        expect(translate("nav.home")).toBe("Home");

        useLanguageStore.setState({ locale: "tr" });
        expect(translate("nav.home")).toBe("Ana Sayfa");
    });
});

describe("translation tables", () => {
    it("defines every English key in Turkish too", () => {
        const missing = Object.keys(translations.en).filter(
            (key) => !(key in translations.tr),
        );
        expect(missing).toEqual([]);
    });

    it("has no empty translation values", () => {
        const empty = Object.entries(translations.tr)
            .filter(([, value]) => value.trim() === "")
            .map(([key]) => key);
        expect(empty).toEqual([]);
    });
});
