import { describe, expect, it } from "vitest";
import { checkDraft } from "./useArticleEditor";
import { ARTICLE_LIMITS } from "../api/article.types";
import { MAX_MENTIONS } from "../../../shared/utils/mentions";
import type { ArticleDraft } from "./useArticleEditor";

const draft = (overrides: Partial<ArticleDraft> = {}): ArticleDraft => ({
    title: "A title",
    body: "A body.",
    excerpt: "",
    coverAlt: "",
    tags: [],
    categories: [],
    ...overrides,
});

/** What the caller passes for the byte check; only its size matters here. */
const serialised = (d: ArticleDraft) => JSON.stringify(d);

describe("checkDraft", () => {
    it("passes a draft with a title and a body", () => {
        const d = draft();
        expect(checkDraft(d, serialised(d))).toBeNull();
    });

    it.each([
        ["no title", { title: "" }],
        ["no body", { body: "" }],
        ["neither", { title: "", body: "" }],
    ])("reports %s as empty", (_name, overrides) => {
        const d = draft(overrides);
        expect(checkDraft(d, serialised(d))).toBe("empty");
    });

    it("reports a title past its limit", () => {
        const d = draft({ title: "a".repeat(ARTICLE_LIMITS.titleMax + 1) });
        expect(checkDraft(d, serialised(d))).toBe("titleTooLong");
    });

    it("reports a body past its limit", () => {
        const d = draft({ body: "a".repeat(ARTICLE_LIMITS.bodyMax + 1) });
        expect(checkDraft(d, serialised(d))).toBe("bodyTooLong");
    });

    /*
     * The mention cap is checked here rather than at the publish button, and
     * that placement is the point: autosave is gated on the same `canSave`, so
     * a body naming eleven people would otherwise retry a request the server
     * is certain to refuse, every two seconds, for as long as the editor
     * stayed open.
     */
    describe("the mention cap", () => {
        const naming = (n: number) =>
            draft({
                body: Array.from({ length: n }, (_, i) => `@user${i}`).join(
                    " ",
                ),
            });

        it("allows exactly the maximum", () => {
            const d = naming(MAX_MENTIONS);
            expect(checkDraft(d, serialised(d))).toBeNull();
        });

        it("refuses one more", () => {
            const d = naming(MAX_MENTIONS + 1);
            expect(checkDraft(d, serialised(d))).toBe("tooManyMentions");
        });

        // The server counts distinct accounts, not occurrences, and so must
        // this — otherwise a body repeating one name is refused for nothing.
        it("counts a repeated handle once", () => {
            const d = draft({ body: "@ada ".repeat(MAX_MENTIONS + 5) });
            expect(checkDraft(d, serialised(d))).toBeNull();
        });

        it("does not count an email address", () => {
            const d = draft({
                body: Array.from(
                    { length: MAX_MENTIONS + 5 },
                    (_, i) => `user${i}@example.com`,
                ).join(" "),
            });
            expect(checkDraft(d, serialised(d))).toBeNull();
        });
    });

    // Characters are not bytes: a body inside the character limit still
    // breaches the request cap once it carries Turkish letters or emoji.
    it("reports a payload past the byte cap", () => {
        const d = draft();
        const oversized = "x".repeat(ARTICLE_LIMITS.requestBytesMax + 1);
        expect(checkDraft(d, oversized)).toBe("tooLarge");
    });
});
