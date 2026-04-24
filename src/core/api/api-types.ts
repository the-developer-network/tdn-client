export class NetworkError extends Error {
    constructor(message = "Network request failed") {
        super(message);
        this.name = "NetworkError";
    }
}

export interface ApiResponse<T> {
    data: T;
    meta?: unknown;
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
