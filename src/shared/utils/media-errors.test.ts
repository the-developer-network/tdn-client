import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    MEDIA_ERROR_TITLES,
    clearsSelection,
    isMediaError,
    withModerationRetry,
} from "./media-errors";

/** The shape `apiClient` throws: an RFC 7807 document. */
function problem(title: string, status: number) {
    return {
        type: "about:blank",
        title,
        status,
        detail: "Something the server said in English.",
        instance: "/api/v1/media",
    };
}

describe("clearsSelection", () => {
    it.each([
        [MEDIA_ERROR_TITLES.rejected, 422],
        [MEDIA_ERROR_TITLES.invalidMediaType, 415],
        [MEDIA_ERROR_TITLES.invalidFileType, 415],
        [MEDIA_ERROR_TITLES.tooLarge, 413],
    ])("throws the selection away on %s", (title, status) => {
        expect(clearsSelection(problem(title, status))).toBe(true);
    });

    /*
     * The one that matters. A 503 never reached a verdict, so the files are
     * still fine — clearing them would be the client inventing a rejection the
     * server did not make, and it would do it during an outage, when the
     * person can least afford to lose four picked files.
     */
    it("keeps the selection when moderation was merely unreachable", () => {
        expect(
            clearsSelection(problem(MEDIA_ERROR_TITLES.unavailable, 503)),
        ).toBe(false);
    });

    it("keeps the selection for anything that is not a verdict", () => {
        // A failure from the *create* call that follows the upload, a dropped
        // connection, a 500. None of these say anything about the files.
        expect(clearsSelection(problem("InternalServerError", 500))).toBe(
            false,
        );
        expect(clearsSelection(new Error("boom"))).toBe(false);
        expect(clearsSelection(null)).toBe(false);
        expect(clearsSelection(undefined)).toBe(false);
        expect(clearsSelection("MediaRejectedError")).toBe(false);
    });
});

describe("isMediaError", () => {
    it("matches on title, not on status", () => {
        const err = problem(MEDIA_ERROR_TITLES.notOwned, 400);
        expect(isMediaError(err, MEDIA_ERROR_TITLES.notOwned)).toBe(true);
        expect(isMediaError(err, MEDIA_ERROR_TITLES.rejected)).toBe(false);
    });

    /*
     * Two of these errors share 415, and 422 against 503 is the difference
     * between "this file is not allowed" and "try again in a moment" — so
     * status is never enough to tell them apart.
     */
    it("does not confuse the two 415s", () => {
        const media = problem(MEDIA_ERROR_TITLES.invalidMediaType, 415);
        expect(isMediaError(media, MEDIA_ERROR_TITLES.invalidFileType)).toBe(
            false,
        );
    });
});

describe("withModerationRetry", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("does not retry an upload that worked", async () => {
        const upload = vi.fn().mockResolvedValue({ mediaUrls: ["a.png"] });

        await expect(withModerationRetry(upload)).resolves.toEqual({
            mediaUrls: ["a.png"],
        });
        expect(upload).toHaveBeenCalledTimes(1);
    });

    it("retries once when moderation was unreachable, and succeeds", async () => {
        const upload = vi
            .fn()
            .mockRejectedValueOnce(problem(MEDIA_ERROR_TITLES.unavailable, 503))
            .mockResolvedValue({ mediaUrls: ["a.png"] });

        const promise = withModerationRetry(upload);
        await vi.runAllTimersAsync();

        await expect(promise).resolves.toEqual({ mediaUrls: ["a.png"] });
        expect(upload).toHaveBeenCalledTimes(2);
    });

    /*
     * One retry, not a loop. A provider blinking is worth absorbing; a real
     * outage is not something to hide behind a spinner that never ends, so the
     * second failure reaches the caller, which keeps the files and lets the
     * person try again themselves.
     */
    it("gives up after the second failure and throws it on", async () => {
        const err = problem(MEDIA_ERROR_TITLES.unavailable, 503);
        const upload = vi.fn().mockRejectedValue(err);

        const promise = withModerationRetry(upload);
        const assertion = expect(promise).rejects.toBe(err);
        await vi.runAllTimersAsync();
        await assertion;

        expect(upload).toHaveBeenCalledTimes(2);
    });

    it("does not retry a verdict", async () => {
        const err = problem(MEDIA_ERROR_TITLES.rejected, 422);
        const upload = vi.fn().mockRejectedValue(err);

        await expect(withModerationRetry(upload)).rejects.toBe(err);
        // Retrying a rejection would spend a second moderation call to be told
        // the same thing, and would delay telling the person by three seconds.
        expect(upload).toHaveBeenCalledTimes(1);
    });
});
