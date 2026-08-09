/**
 * The fixed payloads `api-stub.ts` serves, shared with the specs so an
 * assertion cannot drift from what the stub actually returns.
 */

/** The one post the sitemap is built from. */
export const STUB_POST_ID = "stub-post-1";
export const STUB_POST_AUTHOR = "stubauthor";
export const STUB_POST_DATE = "2026-01-02";

/** Both detail endpoints echo the requested id, so a spec can name any. */
export function stubProfileName(username: string): string {
    return `Stub ${username}`;
}

export function stubPostContent(id: string): string {
    return `Stub post ${id}`;
}
