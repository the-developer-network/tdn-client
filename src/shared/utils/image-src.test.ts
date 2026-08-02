import { describe, expect, it } from "vitest";
import { getSafeImageSrc } from "./image-src";

describe("getSafeImageSrc", () => {
    describe("allowed protocols", () => {
        it("keeps an https URL", () => {
            expect(getSafeImageSrc("https://cdn.example.com/a.png")).toBe(
                "https://cdn.example.com/a.png",
            );
        });

        it("keeps an http URL", () => {
            expect(getSafeImageSrc("http://cdn.example.com/a.png")).toBe(
                "http://cdn.example.com/a.png",
            );
        });

        it("keeps a blob URL from URL.createObjectURL", () => {
            const blob = `blob:${window.location.origin}/8f1e-4c2a`;
            expect(getSafeImageSrc(blob)).toBe(blob);
        });

        it("resolves a relative path against the current origin", () => {
            expect(getSafeImageSrc("/uploads/a.png")).toBe(
                `${window.location.origin}/uploads/a.png`,
            );
        });
    });

    describe("rejected protocols", () => {
        it("rejects a javascript: URL", () => {
            expect(getSafeImageSrc("javascript:alert(1)")).toBeNull();
        });

        it("rejects a javascript: URL regardless of casing", () => {
            expect(getSafeImageSrc("JaVaScRiPt:alert(1)")).toBeNull();
        });

        it("rejects a data: URL", () => {
            expect(
                getSafeImageSrc("data:text/html;base64,PHNjcmlwdD4="),
            ).toBeNull();
        });

        it("rejects a vbscript: URL", () => {
            expect(getSafeImageSrc("vbscript:msgbox(1)")).toBeNull();
        });

        it("rejects a file: URL", () => {
            expect(getSafeImageSrc("file:///etc/passwd")).toBeNull();
        });
    });

    describe("empty and malformed input", () => {
        it.each([null, undefined, ""])("returns null for %p", (input) => {
            expect(getSafeImageSrc(input)).toBeNull();
        });

        it("returns null for a string that cannot be parsed as a URL", () => {
            // A lone "%" is an invalid escape and makes the URL parser throw.
            expect(getSafeImageSrc("http://%")).toBeNull();
        });
    });
});
