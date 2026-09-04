import { describe, expect, it } from "vitest";
import { readActiveHandle } from "./useMentionAutocomplete";

/**
 * The caret reader, which decides whether a suggestion list opens at all.
 *
 * It has to agree with the rendering grammar in `mentions.ts` about what an
 * `@` starts — otherwise the list offers accounts for something that will
 * never become a link, which is a worse lie than offering nothing.
 *
 * A pure function on purpose: everything else in the hook is a textarea and a
 * debounce, and neither is where this goes wrong.
 */
describe("readActiveHandle", () => {
    const at = (text: string) => readActiveHandle(text, text.length);

    it("opens on a bare @", () => {
        expect(at("hello @")).toEqual({ start: 6, query: "" });
    });

    it("reads what has been typed so far", () => {
        expect(at("hello @ad")).toEqual({ start: 6, query: "ad" });
    });

    it("opens at the very start of a body", () => {
        expect(at("@ad")).toEqual({ start: 0, query: "ad" });
    });

    it("includes the characters a handle may contain", () => {
        expect(at("@ada.b_c")).toEqual({ start: 0, query: "ada.b_c" });
    });

    it("opens after punctuation", () => {
        expect(at("(@ad")).toEqual({ start: 1, query: "ad" });
        expect(at("hi,@ad")).toEqual({ start: 3, query: "ad" });
    });

    /*
     * The same rule the renderer applies. Suggesting accounts while someone
     * types an email address would offer a link that can never exist.
     */
    describe("stays shut where a mention cannot start", () => {
        it.each([
            ["inside an email address", "ada@exam"],
            ["inside a path", "docs/@v2"],
            ["after a doubled marker", "@@he"],
        ])("%s", (_name, text) => {
            expect(at(text)).toBeNull();
        });

        it("with no @ at all", () => {
            expect(at("hello there")).toBeNull();
        });

        it("once a space has ended the handle", () => {
            expect(at("@ada done")).toBeNull();
        });
    });

    /*
     * Only the text before the caret is read. Without that, moving the caret
     * back into a finished handle reopens the list on every keystroke
     * elsewhere in the body.
     */
    describe("reads from the caret, not the whole body", () => {
        it("ignores what comes after it", () => {
            expect(readActiveHandle("@ada and @bob", 4)).toEqual({
                start: 0,
                query: "ada",
            });
        });

        it("finds the handle the caret is actually in", () => {
            const text = "@ada and @bo";
            expect(readActiveHandle(text, text.length)).toEqual({
                start: 9,
                query: "bo",
            });
        });

        it("is null when the caret sits before any @", () => {
            expect(readActiveHandle("hi @ada", 2)).toBeNull();
        });
    });
});
