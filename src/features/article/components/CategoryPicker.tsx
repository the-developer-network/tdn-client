import { Gamepad2, Monitor, Server, Smartphone, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useI18n } from "../../../shared/hooks/useI18n";
import type { TranslationKey } from "../../../shared/i18n/translations";
import { ARTICLE_LIMITS } from "../api/article.types";
import type { ArticleCategory } from "../api/article.types";

const CATEGORIES: {
    labelKey: TranslationKey;
    value: ArticleCategory;
    Icon: LucideIcon;
}[] = [
    { labelKey: "feed.frontend", value: "FRONTEND", Icon: Monitor },
    { labelKey: "feed.backend", value: "BACKEND", Icon: Server },
    { labelKey: "feed.mobile", value: "MOBILE", Icon: Smartphone },
    { labelKey: "feed.game", value: "GAME", Icon: Gamepad2 },
    { labelKey: "feed.ai", value: "AI", Icon: Sparkles },
];

interface CategoryPickerProps {
    selected: ArticleCategory[];
    onChange: (categories: ArticleCategory[]) => void;
}

export function CategoryPicker({ selected, onChange }: CategoryPickerProps) {
    const { t } = useI18n();

    function toggle(value: ArticleCategory) {
        if (selected.includes(value)) {
            onChange(selected.filter((it) => it !== value));
            return;
        }
        // There are only five categories and the cap is five, so this cannot
        // bite today — but the cap is the server's, not this list's.
        if (selected.length >= ARTICLE_LIMITS.categoriesMax) return;
        onChange([...selected, value]);
    }

    return (
        <div>
            <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(({ labelKey, value, Icon }) => (
                    <button
                        key={value}
                        type="button"
                        onClick={() => toggle(value)}
                        aria-pressed={selected.includes(value)}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                            selected.includes(value)
                                ? "bg-white text-black"
                                : "bg-white/10 text-white/60 hover:bg-white/15 hover:text-white/80"
                        }`}
                    >
                        <Icon size={13} />
                        {t(labelKey)}
                    </button>
                ))}
            </div>
            <p className="mt-1.5 text-xs text-white/30">
                {t("editor.categoriesHint", {
                    max: ARTICLE_LIMITS.categoriesMax,
                })}
            </p>
        </div>
    );
}
