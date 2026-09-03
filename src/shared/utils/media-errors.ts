import type { ApiErrorResponse } from "../../core/api/api-types";
import type { TranslationKey } from "../i18n/translations";

/**
 * The errors the moderation work added to the four upload endpoints
 * (`/media`, `/articles/cover`, `profiles/me/avatar`, `profiles/me/banner`)
 * and to post/comment creation.
 *
 * Branch on `title`, not on status: two of these share 415, and the status
 * alone cannot tell "this file is not allowed" from "we could not check it
 * right now" — which are opposite instructions to the person holding the file.
 */
export const MEDIA_ERROR_TITLES = {
    rejected: "MediaRejectedError",
    unavailable: "ModerationUnavailableError",
    /** 415 from `/media`, which takes video as well as images. */
    invalidMediaType: "InvalidMediaTypeError",
    /** 415 from the cover, avatar and banner endpoints, which take images. */
    invalidFileType: "InvalidFileTypeError",
    tooLarge: "PayloadTooLargeError",
    /**
     * 400 from post/comment creation, and from a message: an upload belongs to
     * one piece of content, and to one channel. A file uploaded through
     * `POST /media` cannot be attached to a message, and one uploaded through
     * `POST /messages/media` cannot be attached to a post — the channel is
     * fixed when the bytes arrive.
     */
    notOwned: "MediaNotOwnedError",
    /** 400: more than four files in one request. */
    limitExceeded: "MediaLimitExceededError",
    /** 400: an upload request carrying no files at all. */
    noneProvided: "NoMediaProvidedError",
} as const;

/**
 * A deliberate exception to `getErrorMessage`'s rule of showing the server's
 * `detail` verbatim on a 4xx.
 *
 * The rule holds everywhere else, and for a good reason — the API writes
 * messages the client cannot infer from a status. These are the opposite case:
 * the wording is fixed, the API says it in English only, and it is shown to
 * someone in the middle of posting or writing a message. So the `title` is the
 * contract and the sentence is ours.
 */
export const MEDIA_ERROR_MESSAGE_KEYS: Record<string, TranslationKey> = {
    [MEDIA_ERROR_TITLES.rejected]: "error.mediaRejected",
    [MEDIA_ERROR_TITLES.unavailable]: "error.moderationUnavailable",
    [MEDIA_ERROR_TITLES.invalidMediaType]: "error.invalidMediaType",
    [MEDIA_ERROR_TITLES.invalidFileType]: "error.invalidFileType",
    [MEDIA_ERROR_TITLES.tooLarge]: "error.payloadTooLarge",
    [MEDIA_ERROR_TITLES.notOwned]: "error.mediaNotOwned",
    [MEDIA_ERROR_TITLES.limitExceeded]: "error.mediaLimitExceeded",
    [MEDIA_ERROR_TITLES.noneProvided]: "error.noMediaProvided",
};

function titleOf(err: unknown): string | null {
    if (!err || typeof err !== "object") return null;
    const { title } = err as Partial<ApiErrorResponse>;
    return typeof title === "string" ? title : null;
}

export function isMediaError(
    err: unknown,
    title: (typeof MEDIA_ERROR_TITLES)[keyof typeof MEDIA_ERROR_TITLES],
): boolean {
    return titleOf(err) === title;
}

/**
 * Whether the files the person picked have to be thrown away.
 *
 * Only a verdict clears them, and the default is to keep. Getting this the
 * other way round — clear unless told otherwise — would take someone's four
 * selected files away over a 500 from the *create* call that follows the
 * upload, or over a dropped connection, neither of which says anything about
 * the files.
 *
 * A verdict has to clear all of them, not the offending one. `/media` takes up
 * to four files and processes them in order; a rejection anywhere in that run
 * returns no URLs at all — not even for the files that uploaded before it —
 * and does not say which file it was. So there is nothing to salvage and no
 * information with which to salvage it.
 *
 * `ModerationUnavailableError` is deliberately absent: it never reached a
 * verdict, so the same files are still fine and dropping them would be the
 * client inventing a rejection the server did not make.
 *
 * `MediaLimitExceededError` and `NoMediaProvidedError` are absent for a
 * different reason: they are not verdicts on the files either, they are
 * answers about the request. "You picked five" is fixed by putting one back,
 * and taking all five away to say so is the least useful reading of it.
 */
const VERDICT_TITLES: string[] = [
    MEDIA_ERROR_TITLES.rejected,
    MEDIA_ERROR_TITLES.invalidMediaType,
    MEDIA_ERROR_TITLES.invalidFileType,
    MEDIA_ERROR_TITLES.tooLarge,
];

export function clearsSelection(err: unknown): boolean {
    const title = titleOf(err);
    return title !== null && VERDICT_TITLES.includes(title);
}

/** How long to wait before the one automatic retry of a 503. */
export const MODERATION_RETRY_DELAY_MS = 3000;

/**
 * Runs an upload, retrying once if the moderation provider was unreachable.
 *
 * One retry, not a loop: the provider blinking is worth absorbing silently,
 * but an outage is not something to hide behind a spinner that never ends.
 * The second failure reaches the caller, which keeps the files and offers the
 * person the retry themselves.
 */
export async function withModerationRetry<T>(
    upload: () => Promise<T>,
    delayMs: number = MODERATION_RETRY_DELAY_MS,
): Promise<T> {
    try {
        return await upload();
    } catch (err) {
        if (!isMediaError(err, MEDIA_ERROR_TITLES.unavailable)) throw err;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return upload();
    }
}
