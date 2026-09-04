import { useLayoutEffect, useRef, useState } from "react";
import type { Profile } from "../../../features/profile/api/profile.types";
import { placeList } from "../../utils/caret-position";
import type { CaretPoint, Placement } from "../../utils/caret-position";
import { useI18n } from "../../hooks/useI18n";

interface MentionSuggestionsProps {
    isOpen: boolean;
    isLoading: boolean;
    results: Profile[];
    highlighted: number;
    onHighlight: (index: number) => void;
    onSelect: (profile: Profile) => void;
    /** Where the caret is inside the field, or `null` when nothing is open. */
    point: CaretPoint | null;
    /** The field the list belongs to, for its box. */
    fieldRef: React.RefObject<HTMLTextAreaElement | null>;
}

/**
 * The list under an `@handle` being typed.
 *
 * Positioned on the caret's line rather than under the field. Anchoring it to
 * the container put it below the whole composer — past the media previews and
 * the toolbar — which read as a list belonging to nothing.
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
    point,
    fieldRef,
}: MentionSuggestionsProps) {
    const { t } = useI18n();
    const listRef = useRef<HTMLUListElement>(null);
    const [placement, setPlacement] = useState<Placement | null>(null);

    /*
     * A layout effect, not an effect: it runs before paint, so the list is
     * measured and moved in the same frame it appears in and never shows up in
     * the corner first.
     */
    useLayoutEffect(() => {
        const field = fieldRef.current;
        const list = listRef.current;
        if (!point || !field || !list) {
            setPlacement(null);
            return;
        }

        const fieldBox = field.getBoundingClientRect();
        const listBox = list.getBoundingClientRect();
        setPlacement(
            placeList({
                point,
                field: {
                    top: fieldBox.top,
                    left: fieldBox.left,
                    width: fieldBox.width,
                },
                listWidth: listBox.width,
                listHeight: listBox.height,
                viewportHeight: window.innerHeight,
            }),
        );
        // `results` is in here because the list changes height as they arrive,
        // and a stale height flips it the wrong way near the bottom.
    }, [point, results, fieldRef]);

    if (!isOpen && !isLoading) return null;

    return (
        <ul
            ref={listRef}
            role="listbox"
            aria-label={t("mention.suggestions")}
            style={{
                top: placement?.top ?? 0,
                left: placement?.left ?? 0,
            }}
            // `w-[320px] max-w-full`: the cap is what makes the list span a
            // narrow field instead of running off the side of a phone, and
            // `placeList` keeps its left edge inside the field either way.
            className="absolute z-30 mt-1 w-[320px] max-w-full max-h-64 overflow-y-auto rounded-2xl border border-ink/10 bg-surface-1 shadow-xl"
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
