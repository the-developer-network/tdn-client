import { TAG_PATTERN } from "../api/article.types";

/**
 * Folds what the writer typed into what the server will accept.
 *
 * The server lowercases and trims anyway, so doing it here only makes the chip
 * on screen match what will be stored. Spaces become hyphens because "clean
 * architecture" is the obvious thing to type and `clean-architecture` is the
 * only way to say it.
 *
 * Turkish letters are transliterated rather than dropped: `yazılım` quietly
 * becoming `yazlm` would be worse than either rejecting it outright or turning
 * it into `yazilim`. Anything still outside the pattern is removed, because a
 * rejected tag comes back as a bare 400 that never names the field.
 */
export function normaliseTag(raw: string): string {
    return raw
        .trim()
        .toLowerCase()
        .replace(/ı/g, "i")
        .replace(/ş/g, "s")
        .replace(/ğ/g, "g")
        .replace(/ü/g, "u")
        .replace(/ö/g, "o")
        .replace(/ç/g, "c")
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .slice(0, 30);
}

export function isValidTag(tag: string): boolean {
    return TAG_PATTERN.test(tag);
}
