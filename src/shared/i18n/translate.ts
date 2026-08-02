import { useLanguageStore } from "../store/language.store";
import { translations } from "./translations";
import type { TranslationKey } from "./translations";
import type { Locale } from "../store/language.store";

/**
 * Framework-free translation lookup, for code that runs outside a React
 * render (utils, socket callbacks). Components should use `useI18n` instead
 * so they re-render when the locale changes.
 */
export function translateWith(
    locale: Locale,
    key: TranslationKey,
    vars?: Record<string, string | number>,
): string {
    let str: string = translations[locale][key] ?? translations.en[key] ?? key;

    if (vars) {
        str = str.replace(/\{\{(\w+)\}\}/g, (_, k: string) =>
            k in vars ? String(vars[k]) : `{{${k}}}`,
        );
    }

    return str;
}

export function translate(
    key: TranslationKey,
    vars?: Record<string, string | number>,
): string {
    return translateWith(useLanguageStore.getState().locale, key, vars);
}
