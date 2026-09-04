import { useCallback, useEffect, useRef, useState } from "react";
import { useProfileSearch } from "../../features/profile/hooks/useProfileSearch";
import { getCaretPoint } from "../utils/caret-position";
import type { CaretPoint } from "../utils/caret-position";
import type { Profile } from "../../features/profile/api/profile.types";

/**
 * The handle being typed at the caret, if there is one.
 *
 * Scans back from the caret over the handle character set to the `@`, then
 * checks the character before it with the **same** rule the grammar uses — an
 * `@` glued to a word, a path or another `@` is not the start of a mention, so
 * typing inside an email address must not open a suggestion list.
 *
 * Only the text before the caret is read. Editing the middle of a finished
 * handle should not reopen the list on every keystroke.
 */
export interface ActiveHandle {
    /** Index of the `@`. */
    start: number;
    /** What has been typed after it, possibly empty. */
    query: string;
}

export function readActiveHandle(
    value: string,
    caret: number,
): ActiveHandle | null {
    let i = caret;
    while (i > 0 && /[A-Za-z0-9._]/.test(value[i - 1])) i -= 1;
    if (i === 0 || value[i - 1] !== "@") return null;

    const at = i - 1;
    const before = at > 0 ? value[at - 1] : "";
    if (before && /[A-Za-z0-9._/@]/.test(before)) return null;

    return { start: at, query: value.slice(i, caret) };
}

interface Options {
    value: string;
    onChange: (next: string) => void;
    inputRef: React.RefObject<HTMLTextAreaElement | null>;
    /**
     * How many characters after the `@` before the search runs.
     *
     * One, not the two `useProfileSearch` defaults to. That threshold is set
     * for the profile search box, where someone is looking something up and a
     * single letter matches most of the site. Completing a handle is the
     * opposite: the author usually knows who they mean, and waiting for a
     * second character reads as the feature not working — which is exactly how
     * it was reported.
     *
     * The extra requests are affordable: the search is debounced 300 ms, so a
     * burst of typing sends one, and reads are allowed 60 a minute.
     */
    minChars?: number;
}

/**
 * Suggests accounts while an `@handle` is being typed.
 *
 * Reuses `useProfileSearch`, which already debounces and holds a minimum query
 * length — there is no mention-search endpoint and the API doc says to use
 * profile search for exactly this.
 *
 * The caret is restored by an effect rather than straight after `onChange`,
 * because the textarea has not re-rendered with the new value yet at that
 * point and setting a selection past the old length silently clamps.
 */
export function useMentionAutocomplete({
    value,
    onChange,
    inputRef,
    minChars = 1,
}: Options) {
    const { query, setQuery, results, isLoading } = useProfileSearch(minChars);
    const [active, setActive] = useState<ActiveHandle | null>(null);
    /**
     * Where the caret was when the list opened, so it can sit on that line
     * rather than under the whole composer — which is where it used to land,
     * 65px and a toolbar below the text in the post box, and eighteen rows
     * below it in the article editor.
     */
    const [point, setPoint] = useState<CaretPoint | null>(null);
    const [highlighted, setHighlighted] = useState(0);
    const pendingCaret = useRef<number | null>(null);

    const isOpen = active !== null && results.length > 0;

    useEffect(() => {
        if (pendingCaret.current === null) return;
        const el = inputRef.current;
        const caret = pendingCaret.current;
        pendingCaret.current = null;
        if (!el) return;
        el.focus();
        el.setSelectionRange(caret, caret);
    }, [value, inputRef]);

    /** Called from the textarea's own `onChange`, after the value is set. */
    const sync = useCallback(() => {
        const el = inputRef.current;
        if (!el) return;
        const found = readActiveHandle(
            el.value,
            el.selectionStart ?? el.value.length,
        );
        setActive(found);
        setHighlighted(0);
        setQuery(found?.query ?? "");
        // Measured only while a handle is being typed. The mirror is built and
        // torn down each time, and doing that on every keystroke of ordinary
        // prose would be work nobody asked for.
        setPoint(found ? getCaretPoint(el) : null);
    }, [inputRef, setQuery]);

    const close = useCallback(() => {
        setActive(null);
        setPoint(null);
        setQuery("");
    }, [setQuery]);

    const select = useCallback(
        (profile: Profile) => {
            const el = inputRef.current;
            if (!el || !active) return;

            const end = active.start + 1 + active.query.length;
            // A trailing space, because the next thing typed is almost never
            // part of the handle — and without it the list reopens on the very
            // character that was meant to end it.
            const inserted = `@${profile.username} `;
            onChange(
                value.slice(0, active.start) + inserted + value.slice(end),
            );
            pendingCaret.current = active.start + inserted.length;
            close();
        },
        [active, close, inputRef, onChange, value],
    );

    /**
     * Returns `true` when the key was the list's to handle, so the caller can
     * stop it reaching the textarea or submitting the form.
     */
    const onKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLTextAreaElement>): boolean => {
            if (!isOpen) return false;

            switch (event.key) {
                case "ArrowDown":
                    event.preventDefault();
                    setHighlighted((i) => (i + 1) % results.length);
                    return true;
                case "ArrowUp":
                    event.preventDefault();
                    setHighlighted(
                        (i) => (i - 1 + results.length) % results.length,
                    );
                    return true;
                case "Enter":
                case "Tab":
                    event.preventDefault();
                    select(results[highlighted]);
                    return true;
                case "Escape":
                    event.preventDefault();
                    close();
                    return true;
                default:
                    return false;
            }
        },
        [close, highlighted, isOpen, results, select],
    );

    return {
        isOpen,
        point,
        results,
        isLoading: isLoading && active !== null,
        highlighted,
        setHighlighted,
        query,
        sync,
        close,
        select,
        onKeyDown,
    };
}
