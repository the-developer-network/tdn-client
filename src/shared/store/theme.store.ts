import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

/**
 * Read by hand in the inline script in `index.html`, which runs before any
 * module does. Renaming it here without renaming it there silently reinstates
 * the flash of the wrong theme on every cold load.
 */
export const THEME_STORAGE_KEY = "tdn-theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

interface ThemeState {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            /**
             * Dark rather than `"system"`. The app shipped dark-only, so every
             * account already reading it is reading it dark — defaulting to the
             * OS preference would repaint the app white for everyone whose
             * laptop is set to light, which none of them asked for. Light is
             * the thing being added here, so it is the thing opted into.
             */
            theme: "dark",
            setTheme: (theme) => set({ theme }),
        }),
        { name: THEME_STORAGE_KEY },
    ),
);

/**
 * `matchMedia` is guarded rather than called: jsdom leaves it undefined, so an
 * unguarded call takes down every test whose module graph reaches this file,
 * whatever the test was actually about.
 */
export function systemPrefersDark(): boolean {
    return window.matchMedia?.(DARK_QUERY).matches ?? true;
}

export function resolveTheme(theme: Theme): ResolvedTheme {
    if (theme !== "system") return theme;
    return systemPrefersDark() ? "dark" : "light";
}

export function watchSystemTheme(onChange: () => void): () => void {
    const query = window.matchMedia?.(DARK_QUERY);
    query?.addEventListener?.("change", onChange);
    return () => query?.removeEventListener?.("change", onChange);
}
