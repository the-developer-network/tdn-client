import { describe, expect, it } from "vitest";
import { isValidTag, normaliseTag } from "./tags";

describe("normaliseTag", () => {
    it("lowercases and trims, matching what the server stores", () => {
        expect(normaliseTag("  Fastify  ")).toBe("fastify");
        expect(normaliseTag("PRISMA")).toBe("prisma");
    });

    it("turns spaces into hyphens", () => {
        expect(normaliseTag("clean architecture")).toBe("clean-architecture");
        expect(normaliseTag("a   b")).toBe("a-b");
    });

    // Dropping these outright would turn `yazılım` into `yazlm`, which is
    // worse than either rejecting it or transliterating it.
    it("transliterates Turkish letters rather than deleting them", () => {
        expect(normaliseTag("yazılım")).toBe("yazilim");
        expect(normaliseTag("çğıöşü")).toBe("cgiosu");
        expect(normaliseTag("Güncel Şeyler")).toBe("guncel-seyler");
    });

    it("strips anything the pattern would reject", () => {
        expect(normaliseTag("c++")).toBe("c");
        expect(normaliseTag("node.js")).toBe("nodejs");
        expect(normaliseTag("hello_world")).toBe("helloworld");
    });

    it("caps at the 30 characters the server allows", () => {
        expect(normaliseTag("a".repeat(50))).toHaveLength(30);
    });

    it("yields an empty string when nothing survives", () => {
        expect(normaliseTag("!!!")).toBe("");
        expect(normaliseTag("   ")).toBe("");
    });

    it("produces something the server pattern accepts, or nothing at all", () => {
        const inputs = [
            "Fastify",
            "clean architecture",
            "yazılım",
            "c++",
            "!!!",
            "a".repeat(50),
            "-leading",
        ];

        for (const input of inputs) {
            const tag = normaliseTag(input);
            expect(tag === "" || isValidTag(tag)).toBe(true);
        }
    });
});
