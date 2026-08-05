import { translate } from "../i18n/translate";

interface DisplayableAuthor {
    username?: string;
    fullName?: string | null;
}

/**
 * The name to show for an author.
 *
 * `username` is **optional** in the API — `PostAuthorSchema` and
 * `CommentAuthorSchema` both mark it so, and the mapper emits `undefined`
 * when the author relation is gone, which makes Fastify drop the key
 * altogether. Interpolating it unguarded produced `/profile/undefined`
 * links and avatar requests for a user called "undefined".
 *
 * Falls back through full name, then handle, then a translated placeholder,
 * so there is always something to render and never a bare `@`.
 */
export function authorDisplayName(author: DisplayableAuthor): string {
    return (
        author.fullName || author.username || translate("common.unknownUser")
    );
}

/**
 * The author's profile path, or `null` when there is no handle to route to.
 * A null result means the name and avatar must not be clickable.
 */
export function authorProfilePath(author: DisplayableAuthor): string | null {
    return author.username ? `/profile/${author.username}` : null;
}
