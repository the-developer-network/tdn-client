/**
 * Protocols allowed to reach an `<img src>`.
 *
 * `blob:` covers local previews produced by `URL.createObjectURL`, `http:`
 * and `https:` cover remote media. Everything else — `javascript:`, `data:`,
 * `vbscript:`, `file:` — resolves to the fallback.
 */
const SAFE_PROTOCOLS = new Set(["http:", "https:", "blob:"]);

/**
 * Validates a URL destined for an `<img src>` and returns it normalised, or
 * `null` when it is missing or uses a protocol we do not trust.
 *
 * The return value is the parsed URL's `href` rather than the original
 * string. That matters: passing the raw input straight through leaves it
 * tainted for static analysis (and for anyone reading the code), whereas
 * returning the parsed form makes the sanitisation explicit.
 *
 * Relative paths are resolved against the current origin, which is a no-op
 * as far as the rendered image is concerned.
 */
export function getSafeImageSrc(src: string | null | undefined): string | null {
    if (!src) return null;

    try {
        const parsed = new URL(src, window.location.origin);
        return SAFE_PROTOCOLS.has(parsed.protocol) ? parsed.href : null;
    } catch {
        return null;
    }
}
