import { useCallback } from "react";
import { useLanguageStore } from "../store/language.store";
import { translateWith } from "../i18n/translate";
import type { TranslationKey } from "../i18n/translations";

export function useI18n() {
    const locale = useLanguageStore((s) => s.locale);

    const t = useCallback(
        (key: TranslationKey, vars?: Record<string, string | number>) =>
            translateWith(locale, key, vars),
        [locale],
    );

    return { t, locale };
}
