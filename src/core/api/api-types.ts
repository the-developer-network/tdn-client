export class NetworkError extends Error {
    constructor(message = "Network request failed") {
        super(message);
        this.name = "NetworkError";
    }
}

export interface ApiResponse<T, M = unknown> {
    data: T;
    meta?: M;
}

/**
 * The `meta` of a cursor-paginated listing.
 *
 * `nextCursor` is opaque: echo it back verbatim and never parse, build or
 * interpret one. It is `null` at the end of a listing, and a cursor the server
 * cannot decode is not an error — it answers with the first page.
 *
 * There is deliberately no total and no page number. A conversation list
 * reorders whenever a message arrives, so both would be stale by the next
 * request.
 */
export interface CursorMeta {
    timestamp: string;
    nextCursor: string | null;
}

//(RFC 7807)
export interface ApiErrorResponse {
    type: string;
    title: string;
    status: number;
    detail: string;
    instance: string;
    validation?: ValidationErrorDetail[];
}

export interface ValidationErrorDetail {
    instancePath: string;
    schemaPath: string;
    keyword: string;
    params: Record<string, unknown>;
    message: string;
}
