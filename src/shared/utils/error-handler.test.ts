import { describe, expect, it } from "vitest";
import { NetworkError } from "../../core/api/api-types";
import { getErrorMessage } from "./error-handler";

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

        it("returns the detail field when no validation array is present", () => {
            expect(
                getErrorMessage({
                    status: 404,
                    title: "Not Found",
                    detail: "User not found",
                }),
            ).toBe("User not found");
        });

        it("returns the title field when detail is absent", () => {
            expect(
                getErrorMessage({
                    status: 500,
                    title: "Internal Server Error",
                }),
            ).toBe("Internal Server Error");
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
