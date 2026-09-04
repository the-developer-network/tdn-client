/**
 * An account named in a body, as the API resolved it.
 *
 * Resolution happens once, at write time, and is stored as a relation to the
 * account rather than as the text that was typed — so `username` is the
 * account's **current** handle and may differ from what the body says if it
 * has since been renamed.
 *
 * Shared rather than declared per feature: posts, comments and articles all
 * carry this and it belongs to none of them.
 */
export interface Mention {
    id: string;
    username: string;
}

/** Most distinct handles one body may name, past which the API answers 400. */
export const MAX_MENTIONS = 10;

/** The bounds the register schema enforces on a username. */
const MIN_HANDLE_LENGTH = 3;
const MAX_HANDLE_LENGTH = 30;

/**
 * Matches an `@handle` in a body. **This grammar mirrors the API's**
 * (`extract-mentions.ts`) and has to keep mirroring it: the API returns the
 * body unchanged and says separately which handles are real, so pairing the
 * two is the client's job. Drift is silent — a link that never appears, or one
 * that points somewhere it should not.
 *
 * The leading group is what stops this firing on a string that merely contains
 * an at-sign: an email (`ada@example.com`), a path (`docs/@v2`), a doubled
 * marker (`@@here`).
 *
 * The API expresses that as a lookbehind. This consumes the character instead,
 * which behaves identically here — every character the class excludes is one
 * that cannot begin a handle, so no overlapping match is lost — and avoids a
 * lookbehind, which Safari did not support until 16.4. Vite does not transpile
 * regex syntax, so an unsupported pattern is not a broken feature but a
 * `SyntaxError` while the module loads: a blank page, on a browser this app
 * otherwise serves.
 *
 * Length is checked after the match rather than in the pattern, because a
 * trailing dot has to be trimmed as punctuation first.
 */
export const MENTION_PATTERN_SOURCE =
    "(?<pre>^|[^A-Za-z0-9._/@])@(?<handle>[A-Za-z0-9._]+)" as const;

/**
 * A fresh matcher each call. A `/g` regex carries `lastIndex`, so a shared one
 * would make the result depend on who read it last.
 */
export const createMentionPattern = () =>
    new RegExp(MENTION_PATTERN_SOURCE, "g");

/**
 * Trims what a sentence put there rather than the author.
 *
 * A handle may legally contain dots and underscores, so only trailing ones are
 * ambiguous: `@ada.` at the end of a sentence is the handle `ada`, while
 * `@ada.b` is the handle `ada.b`.
 */
export function trimHandle(raw: string): string {
    return raw.replace(/[._]+$/, "");
}

/** Whether a trimmed handle could name an account at all. */
export function isHandleLength(handle: string): boolean {
    return (
        handle.length >= MIN_HANDLE_LENGTH && handle.length <= MAX_HANDLE_LENGTH
    );
}

/**
 * The distinct handles a body names, in the casing and order they first
 * appear.
 *
 * Deduplicated case-insensitively, because the API resolves that way and the
 * limit counts distinct accounts rather than distinct spellings.
 *
 * Unlike the API's version this does not throw past the limit. It is read
 * during render as well as before a write, and a composer counting what the
 * author has typed is not the place to raise an error — the caller compares
 * the length against `MAX_MENTIONS` and decides.
 */
export function extractHandles(content: string): string[] {
    const handles: string[] = [];
    const seen = new Set<string>();

    for (const match of content.matchAll(createMentionPattern())) {
        const handle = trimHandle(match.groups!.handle!);
        if (!isHandleLength(handle)) continue;

        const key = handle.toLowerCase();
        if (seen.has(key)) continue;

        seen.add(key);
        handles.push(handle);
    }

    return handles;
}

/**
 * The resolved account for a handle as written, or `undefined`.
 *
 * Case-insensitive, because `@Ada` names the account `ada`.
 *
 * A handle with no match stays plain text wherever this is used, and that
 * covers three different situations on purpose: a typo, an account that has
 * been deleted, and one that has been renamed since the body was written. The
 * last is unmatchable by design — the API stores the relation by id and
 * returns the *current* handle, so there is nothing in the response tying it
 * back to the old spelling in the text. Guessing a pairing would eventually
 * link someone's name to a stranger's profile; leaving it as text never does.
 */
export function findMention(
    handle: string,
    mentions: Mention[] | undefined,
): Mention | undefined {
    if (!mentions?.length) return undefined;
    const key = handle.toLowerCase();
    return mentions.find((m) => m.username.toLowerCase() === key);
}
