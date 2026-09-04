import type { Profile } from "../../../features/profile/api/profile.types";
import { useI18n } from "../../hooks/useI18n";

interface MentionSuggestionsProps {
    isOpen: boolean;
    isLoading: boolean;
    results: Profile[];
    highlighted: number;
    onHighlight: (index: number) => void;
    onSelect: (profile: Profile) => void;
}

/**
 * The list under an `@handle` being typed.
 *
 * Positioned by the composer, which owns the layout — this only draws.
 *
 * Selection is bound to `onMouseDown` rather than `onClick`: the textarea
 * blurs first on a click, and a composer that closes the list on blur would
 * unmount these rows before the click ever landed on one.
 */
export function MentionSuggestions({
    isOpen,
    isLoading,
    results,
    highlighted,
    onHighlight,
    onSelect,
}: MentionSuggestionsProps) {
    const { t } = useI18n();

    if (!isOpen && !isLoading) return null;

    return (
        <ul
            role="listbox"
            aria-label={t("mention.suggestions")}
            className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-2xl border border-ink/10 bg-surface-1 shadow-xl"
        >
            {isLoading && results.length === 0 && (
                <li className="px-4 py-3 text-sm text-ink/40">
                    {t("mention.searching")}
                </li>
            )}

            {results.map((profile, index) => (
                <li key={profile.id}>
                    <button
                        type="button"
                        role="option"
                        aria-selected={index === highlighted}
                        onMouseEnter={() => onHighlight(index)}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            onSelect(profile);
                        }}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            index === highlighted
                                ? "bg-ink/10"
                                : "hover:bg-ink/5"
                        }`}
                    >
                        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-ink/10 bg-surface-2">
                            {profile.avatarUrl ? (
                                <img
                                    src={profile.avatarUrl}
                                    alt=""
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-blue-600 text-xs font-bold text-on-fill">
                                    {profile.username[0].toUpperCase()}
                                </div>
                            )}
                        </div>
                        <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-ink">
                                {profile.fullName || profile.username}
                            </span>
                            <span className="block truncate text-xs text-ink/40">
                                @{profile.username}
                            </span>
                        </span>
                    </button>
                </li>
            ))}
        </ul>
    );
}
