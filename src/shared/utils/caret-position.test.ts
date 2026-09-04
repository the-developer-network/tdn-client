import { describe, expect, it } from "vitest";
import { placeList } from "./caret-position";

/**
 * Only the arithmetic. The measuring half builds a mirror element and reads
 * its geometry, and jsdom reports every element as 0×0 — that part is checked
 * end to end in `e2e/mentions.spec.ts`, where a real browser lays text out.
 */
const base = {
    point: { top: 40, left: 60, lineHeight: 20 },
    field: { top: 100, left: 0, width: 600 },
    listWidth: 320,
    listHeight: 200,
    viewportHeight: 900,
};

describe("placeList", () => {
    it("opens on the line under the caret", () => {
        const { top, flipped } = placeList(base);

        // 40 (caret line) + 20 (one line) — not under the field, which is what
        // the list used to do, 65px and a toolbar away from the text.
        expect(top).toBe(60);
        expect(flipped).toBe(false);
    });

    it("starts at the caret horizontally", () => {
        expect(placeList(base).left).toBe(60);
    });

    describe("staying inside the field", () => {
        it("pulls the list left of the right edge", () => {
            const { left } = placeList({
                ...base,
                point: { ...base.point, left: 500 },
            });

            // 600 - 320: flush with the right edge rather than past it.
            expect(left).toBe(280);
        });

        /*
         * A field narrower than the list is the phone case. Starting at 0 and
         * letting `max-width` cap it means the list spans the field, which is
         * what is wanted there anyway.
         */
        it("starts at zero when the field is narrower than the list", () => {
            const { left } = placeList({
                ...base,
                field: { ...base.field, width: 280 },
                point: { ...base.point, left: 120 },
            });

            expect(left).toBe(0);
        });

        it("never goes negative", () => {
            const { left } = placeList({
                ...base,
                point: { ...base.point, left: 0 },
            });

            expect(left).toBe(0);
        });
    });

    describe("flipping above the line", () => {
        /*
         * On a phone the keyboard takes half the screen, so there is routinely
         * no room under the caret. Opening upwards is the ordinary case there,
         * not an edge one.
         */
        it("opens upwards when there is no room below", () => {
            const { top, flipped } = placeList({
                ...base,
                field: { ...base.field, top: 600 },
                viewportHeight: 700,
            });

            expect(flipped).toBe(true);
            // 40 (caret line) - 200 (list): its bottom sits on that line.
            expect(top).toBe(-160);
        });

        /*
         * Flipping is only better if the list fits above. Near the top of the
         * screen it would run off instead, so the cramped view below wins.
         */
        it("stays below when there is no room above either", () => {
            const { flipped } = placeList({
                ...base,
                field: { ...base.field, top: 10 },
                viewportHeight: 260,
            });

            expect(flipped).toBe(false);
        });

        it("stays below when the space below is enough", () => {
            expect(placeList(base).flipped).toBe(false);
        });
    });
});
