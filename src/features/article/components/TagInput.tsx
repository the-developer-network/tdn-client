import { useState } from "react";
import { X } from "lucide-react";
import { useI18n } from "../../../shared/hooks/useI18n";
import { ARTICLE_LIMITS } from "../api/article.types";
import { isValidTag, normaliseTag } from "../utils/tags";

interface TagInputProps {
    tags: string[];
    onChange: (tags: string[]) => void;
}

export function TagInput({ tags, onChange }: TagInputProps) {
    const { t } = useI18n();
    const [draft, setDraft] = useState("");

    const isFull = tags.length >= ARTICLE_LIMITS.tagsMax;

    function commit() {
        const tag = normaliseTag(draft);
        setDraft("");
        if (!tag || !isValidTag(tag)) return;
        if (tags.includes(tag) || isFull) return;
        onChange([...tags, tag]);
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
            return;
        }
        // Backspace on an empty field removes the chip before the cursor,
        // which is what every other tag field does.
        if (e.key === "Backspace" && draft === "" && tags.length > 0) {
            onChange(tags.slice(0, -1));
        }
    }

    const preview = normaliseTag(draft);
    const willChange = draft.trim() !== "" && preview !== draft.trim();

    return (
        <div>
            <div className="flex flex-wrap items-center gap-2">
                {tags.map((tag) => (
                    <span
                        key={tag}
                        className="flex items-center gap-1 rounded-full bg-ink/10 py-1 pl-3 pr-1.5 text-xs text-ink/70"
                    >
                        #{tag}
                        <button
                            type="button"
                            onClick={() =>
                                onChange(tags.filter((it) => it !== tag))
                            }
                            aria-label={t("editor.removeTag", { tag })}
                            className="rounded-full p-0.5 text-ink/40 transition-colors hover:bg-ink/10 hover:text-ink"
                        >
                            <X size={12} />
                        </button>
                    </span>
                ))}
                {!isFull && (
                    <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={commit}
                        placeholder={t("editor.tagPlaceholder")}
                        aria-label={t("editor.tags")}
                        className="min-w-[10rem] flex-1 bg-transparent py-1 text-sm text-ink outline-none placeholder:text-ink/30"
                    />
                )}
            </div>

            <p className="mt-1.5 text-xs text-ink/30">
                {isFull
                    ? t("editor.tagsFull", { max: ARTICLE_LIMITS.tagsMax })
                    : willChange
                      ? t("editor.tagWillBecome", { tag: preview })
                      : t("editor.tagHint")}
            </p>
        </div>
    );
}
