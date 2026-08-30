import { describe, expect, it } from "vitest";
import { assertList } from "./assert-list";

// Every value here is one the API type says cannot happen, which is the point:
// the guard exists for the gap between what the thunks promise and what a
// proxy, an outage or a mis-shaped handler actually sends.
const notLists = [
    ["null", null],
    ["undefined", undefined],
    ["an object where the list belongs", { posts: [] }],
    ["a string", "[]"],
    ["a number", 0],
] as const;

describe("assertList", () => {
    it("passes an array straight through", () => {
        expect(() => assertList([])).not.toThrow();
        expect(() => assertList([{ id: "1" }])).not.toThrow();
    });

    it.each(notLists)("rejects %s", (_label, value) => {
        expect(() => assertList(value as unknown as unknown[])).toThrow();
    });
});
