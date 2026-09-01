import { beforeEach, describe, expect, it, vi } from "vitest";

// `getErrorMessage` now reaches the persisted language store, which captures
// storage at module-evaluation time — the stub must exist before imports run.
vi.hoisted(() => {
    const store = new Map<string, string>();
    const localStorageMock: Storage = {
        getItem: (key) => store.get(key) ?? null,
        setItem: (key, value) => void store.set(key, String(value)),
        removeItem: (key) => void store.delete(key),
        clear: () => store.clear(),
        key: (index) => [...store.keys()][index] ?? null,
        get length() {
            return store.size;
        },
    };
    Object.defineProperty(globalThis, "localStorage", {
        value: localStorageMock,
        writable: true,
        configurable: true,
    });
});

import { NetworkError } from "../../core/api/api-types";
import { useLanguageStore } from "../store/language.store";
import { getErrorMessage } from "./error-handler";

beforeEach(() => {
    useLanguageStore.setState({ locale: "en" });
});

describe("getErrorMessage", () => {
    describe("NetworkError", () => {
        it("returns a timeout message when the message is 'Request timed out'", () => {
            expect(
                getErrorMessage(new NetworkError("Request timed out")),
            ).toMatch(/timed out/);
        });

        it("returns an internet connectivity message for a generic NetworkError", () => {
            expect(getErrorMessage(new NetworkError())).toMatch(/internet/);
        });
    });

    describe("ApiErrorResponse", () => {
        it("returns the first validation message when a validation array is present", () => {
            const err = {
                status: 422,
                title: "Validation Error",
                detail: "One or more fields are invalid.",
                validation: [
                    {
                        message: "username too short",
                        instancePath: "/username",
                        schemaPath: "#/properties/username/minLength",
                        keyword: "minLength",
                        params: { limit: 3 },
                    },
                ],
            };
            expect(getErrorMessage(err)).toBe("username too short");
        });

        // A 409 says something the client could not have worded better
        // ("Username already taken"), so the server's own text survives.
        it("returns the detail field for a status it has no message for", () => {
            expect(
                getErrorMessage({
                    status: 409,
                    title: "Conflict",
                    detail: "Username already taken",
                }),
            ).toBe("Username already taken");
        });

        it("returns the title field when detail is absent", () => {
            expect(
                getErrorMessage({
                    status: 409,
                    title: "Conflict",
                }),
            ).toBe("Conflict");
        });
    });

    // The API answers in English only — it reads no Accept-Language — so a
    // `detail` shown verbatim reaches a Turkish reader in English. Only the
    // sentences it writes when it has nothing specific to say are replaced.
    describe("localisation", () => {
        it.each([
            "An unexpected error occurred.",
            "The server could not complete the request.",
        ])("translates the generic 5xx sentence %j", (detail) => {
            const err = { status: 500, title: "Error", detail };

            expect(getErrorMessage(err)).toBe(
                "The server could not complete the request. Please try again.",
            );

            useLanguageStore.setState({ locale: "tr" });
            expect(getErrorMessage(err)).toBe(
                "Sunucu isteği tamamlayamadı. Lütfen tekrar deneyin.",
            );
        });

        it("translates a 5xx that carries no detail at all", () => {
            useLanguageStore.setState({ locale: "tr" });
            expect(getErrorMessage({ status: 503, title: "Error" })).toBe(
                "Sunucu isteği tamamlayamadı. Lütfen tekrar deneyin.",
            );
        });

        // apiClient writes these itself for a body it could not read, so the
        // wording is ours to translate whatever the status was.
        it("translates a document apiClient synthesised", () => {
            useLanguageStore.setState({ locale: "tr" });
            expect(
                getErrorMessage({
                    type: "tdn:unreadable-response",
                    status: 502,
                    title: "Bad Gateway",
                    detail: "The server answered 502 with an empty body.",
                }),
            ).toBe("Sunucu isteği tamamlayamadı. Lütfen tekrar deneyin.");
        });

        // A CustomError carries its own message at any status, 5xx included,
        // and a 4xx always says something the client could not word better.
        it.each([
            [401, "Invalid credentials."],
            [403, "You cannot edit this article."],
            [404, "User not found."],
            [429, "Too many requests, please try again later."],
            [503, "Articles are unavailable."],
        ])("leaves %i to the server's own words", (status, detail) => {
            useLanguageStore.setState({ locale: "tr" });
            expect(getErrorMessage({ status, title: "x", detail })).toBe(
                detail,
            );
        });

        it("still prefers a validation message", () => {
            useLanguageStore.setState({ locale: "tr" });
            expect(
                getErrorMessage({
                    status: 400,
                    title: "Validation Error",
                    detail: "Invalid data format provided.",
                    validation: [
                        {
                            message: "username too short",
                            instancePath: "/username",
                            schemaPath: "#/x",
                            keyword: "minLength",
                            params: {},
                        },
                    ],
                }),
            ).toBe("username too short");
        });
    });

    /*
     * The moderation errors are the one place a `detail` is deliberately not
     * shown. Their wording is fixed and the API says it in English only, to
     * someone in the middle of posting — so the `title` is the contract and
     * the sentence is ours. Everything else in this file still keeps the
     * server's words, and the tests above hold that down.
     */
    describe("moderation errors, which are keyed by title", () => {
        it.each([
            ["MediaRejectedError", 422, "breaks the community rules"],
            ["InvalidMediaTypeError", 415, "MP4"],
            ["InvalidFileTypeError", 415, "AVIF"],
            ["PayloadTooLargeError", 413, "5 MB"],
            ["MediaNotOwnedError", 400, "already been used"],
        ])("replaces the server's detail for %s", (title, status, fragment) => {
            const message = getErrorMessage({
                type: "about:blank",
                title,
                status,
                detail: "English sentence the API wrote.",
                instance: "/api/v1/media",
            });

            expect(message).toContain(fragment);
            expect(message).not.toContain("English sentence the API wrote.");
        });

        /*
         * The reason the lookup sits above the generic-5xx branch rather than
         * below it. `ModerationUnavailableError` is a 503, so that branch
         * would answer it with "the server could not complete the request" —
         * losing the only thing worth saying, which is that trying again in a
         * moment will work.
         */
        it("does not let the generic 5xx branch swallow the 503", () => {
            const err = {
                type: "about:blank",
                title: "ModerationUnavailableError",
                status: 503,
                detail: "An unexpected error occurred.",
                instance: "/api/v1/media",
            };

            expect(getErrorMessage(err)).toBe(
                "Media checks are unavailable right now. Please try again in a moment.",
            );

            useLanguageStore.setState({ locale: "tr" });
            expect(getErrorMessage(err)).toBe(
                "Medya kontrolü şu an yapılamıyor. Birazdan tekrar deneyin.",
            );
        });

        it("still prefers a validation message when the API sends one", () => {
            expect(
                getErrorMessage({
                    status: 422,
                    title: "MediaRejectedError",
                    detail: "ignored",
                    validation: [
                        {
                            instancePath: "/files",
                            schemaPath: "#/files",
                            keyword: "maxItems",
                            params: {},
                            message: "at most 4 files",
                        },
                    ],
                }),
            ).toBe("at most 4 files");
        });
    });

    describe("unknown / unrecognised input", () => {
        it("returns the fallback message for null", () => {
            expect(getErrorMessage(null)).toBe("An unexpected error occurred.");
        });

        it("returns the fallback message for a plain string", () => {
            expect(getErrorMessage("oops")).toBe(
                "An unexpected error occurred.",
            );
        });

        it("returns the fallback message for a number", () => {
            expect(getErrorMessage(42)).toBe("An unexpected error occurred.");
        });
    });
});
