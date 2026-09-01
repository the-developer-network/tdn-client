import { useEffect } from "react";
import {
    resolveTheme,
    useThemeStore,
    watchSystemTheme,
} from "../store/theme.store";

/**
 * Stamps the resolved theme onto `<html>` as `data-theme`, which is the hook
 * the token overrides in `index.css` hang off.
 *
 * Mounted once, in `AppInit`. It is not a provider because there is nothing to
 * provide: the value lives in a store any component can read, and the only
 * shared work is the one attribute written here.
 */
export function useTheme() {
    const { theme, setTheme } = useThemeStore();

    useEffect(() => {
        const apply = () => {
            document.documentElement.dataset.theme = resolveTheme(theme);
        };

        apply();

        // Only `"system"` follows the OS, and only it needs the listener. An
        // account that picked light keeps light when the laptop turns dark at
        // sunset, which is the whole point of having picked it.
        if (theme !== "system") return;
        return watchSystemTheme(apply);
    }, [theme]);

    return { theme, setTheme };
}
