/* eslint-disable @typescript-eslint/no-explicit-any */
import { NetworkError } from "../../core/api/api-types";
import type { ApiErrorResponse } from "../../core/api/api-types";

export function isNetworkError(err: unknown): err is NetworkError {
    return err instanceof NetworkError;
}

function isApiErrorResponse(err: any): err is ApiErrorResponse {
    return err && typeof err === "object" && "status" in err && "title" in err;
}

export const getErrorMessage = (err: unknown): string => {
    if (isNetworkError(err)) {
        return err.message === "Request timed out"
            ? "Request timed out. Please check your connection."
            : "Unable to connect. Please check your internet connection.";
    }

    if (isApiErrorResponse(err)) {
        if (err.validation && err.validation.length > 0) {
            return err.validation[0].message;
        }
        return err.detail || err.title || "An API error occurred.";
    }

    return "An unexpected error occurred.";
};
