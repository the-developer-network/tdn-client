/* eslint-disable @typescript-eslint/no-explicit-any */
import { NetworkError } from "../../core/api/api-types";
import { translate } from "../i18n/translate";
import { MEDIA_ERROR_MESSAGE_KEYS } from "./media-errors";
import type { ApiErrorResponse } from "../../core/api/api-types";

/**
 * `detail` values the API produces when it has nothing specific to say.
 *
 * `error-handler.plugin.ts` writes one of these for any non-`CustomError`
 * 5xx, deliberately hiding what actually broke. They are the only server
 * sentences safe to replace with a translated one, because they carry no
 * information to lose.
 */
const GENERIC_SERVER_DETAILS = new Set([
    "An unexpected error occurred.",
    "The server could not complete the request.",
]);

/**
 * `type` on the problem documents `apiClient` synthesises for a body it could
 * not read. Those are ours, not the server's, so their wording is always
 * ours to translate.
 */
const UNREADABLE_RESPONSE_TYPE = "tdn:unreadable-response";

/**
 * The second exception to the rule below, and the last one.
 *
 * Direct messaging allows five writes a minute, which an ordinary exchange
 * reaches — so unlike most 4xx sentences this one is read often, mid
 * conversation, by someone who did nothing wrong. The wording is fixed and
 * carries no detail the server could add, which is what makes it safe to
 * replace; a `detail` that says anything specific is still shown verbatim.
 */
const RATE_LIMIT_TITLE = "TooManyRequestsError";

/**
 * Whether the server said anything worth preserving.
 *
 * The API answers in English only — it reads no `Accept-Language` — so every
 * `detail` shown verbatim reaches a Turkish reader in English. The fix cannot
 * be "translate by status": a 401 from `/auth/login` means "wrong password",
 * not "your session ended", and `error-handler.plugin.ts` lets a `CustomError`
 * carry its own message at *any* status, 5xx included. Matching the handful of
 * sentences the API emits when it is being deliberately vague is the only cut
 * that loses nothing.
 *
 * Everything else keeps the server's own words — "Invalid credentials.",
 * "You cannot follow yourself.", "Articles are unavailable." Localising those
 * is the API's job; the client cannot infer them from a status code.
 */
function isGenericServerError(err: ApiErrorResponse): boolean {
    if (err.type === UNREADABLE_RESPONSE_TYPE) return true;
    if (err.status < 500) return false;
    return !err.detail || GENERIC_SERVER_DETAILS.has(err.detail.trim());
}

export function isNetworkError(err: unknown): err is NetworkError {
    return err instanceof NetworkError;
}

function isApiErrorResponse(err: any): err is ApiErrorResponse {
    return err && typeof err === "object" && "status" in err && "title" in err;
}

export const getErrorMessage = (err: unknown): string => {
    if (isNetworkError(err)) {
        return err.message === "Request timed out"
            ? translate("error.timeout")
            : translate("error.network");
    }

    if (isApiErrorResponse(err)) {
        if (err.validation && err.validation.length > 0) {
            return err.validation[0].message;
        }

        /*
         * Checked before both branches below, and that ordering is the point.
         * `ModerationUnavailableError` is a 503, so the generic-5xx branch
         * would otherwise answer it with "something went wrong" — losing the
         * one thing the person needs to know, which is that trying again in a
         * moment will work. The rest are 4xx and would fall through to the
         * server's English `detail`.
         */
        const mediaKey = MEDIA_ERROR_MESSAGE_KEYS[err.title];
        if (mediaKey) return translate(mediaKey);

        if (err.title === RATE_LIMIT_TITLE)
            return translate("error.rateLimited");

        if (isGenericServerError(err)) return translate("error.server");

        return err.detail || err.title || translate("error.api");
    }

    return translate("error.unexpected");
};
