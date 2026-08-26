import { Check } from "lucide-react";
import { CATEGORY_OPTIONS } from "../../../shared/constants/categories";
import { useI18n } from "../../../shared/hooks/useI18n";
import type { PostCategory } from "../../feed/api/feed.types";

interface InterestPickerProps {
    selected: PostCategory[];
    onToggle: (category: PostCategory) => void;
}

export function InterestPicker({ selected, onToggle }: InterestPickerProps) {
    const { t } = useI18n();

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {CATEGORY_OPTIONS.map(({ labelKey, value, Icon }) => {
                const isSelected = selected.includes(value);
                return (
                    <button
                        key={value}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => onToggle(value)}
                        className={`relative flex flex-col items-center gap-2 rounded-2xl border p-5 transition-colors ${
                            isSelected
                                ? "border-white bg-white/10 text-white"
                                : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/25 hover:text-white"
                        }`}
                    >
                        {isSelected && (
                            <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-black">
                                <Check size={13} strokeWidth={3} />
                            </span>
                        )}
                        <Icon size={24} />
                        <span className="text-sm font-medium">
                            {t(labelKey)}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
