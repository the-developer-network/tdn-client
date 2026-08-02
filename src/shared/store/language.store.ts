import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Locale = "en" | "tr";

interface LanguageState {
    locale: Locale;
    setLocale: (locale: Locale) => void;
}

function detectLocale(): Locale {
    return navigator.language.toLowerCase().startsWith("tr") ? "tr" : "en";
}

export const useLanguageStore = create<LanguageState>()(
    persist(
        (set) => ({
            locale: detectLocale(),
            setLocale: (locale) => set({ locale }),
        }),
        {
            name: "tdn-language",
        },
    ),
);
