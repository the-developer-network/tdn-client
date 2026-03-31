/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ApiErrorResponse } from "../../core/api/api-types";

function isApiErrorResponse(err: any): err is ApiErrorResponse {
    return err && typeof err === "object" && "status" in err && "title" in err;
}

export const getErrorMessage = (err: unknown): string => {
    if (isApiErrorResponse(err)) {
        if (err.validation && err.validation.length > 0) {
            return err.validation[0].message;
        }
        return err.detail || err.title || "An API error occurred.";
    }

    return "An unexpected error occurred.";
};
