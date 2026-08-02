/* eslint-disable @typescript-eslint/no-explicit-any */
import { NetworkError } from "../../core/api/api-types";
import { translate } from "../i18n/translate";
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
            ? translate("error.timeout")
            : translate("error.network");
    }

    if (isApiErrorResponse(err)) {
        if (err.validation && err.validation.length > 0) {
            return err.validation[0].message;
        }
        return err.detail || err.title || translate("error.api");
    }

    return translate("error.unexpected");
};
