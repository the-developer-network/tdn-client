import type { ApiErrorResponse, ApiResponse } from "./api-types";

const BASE_URL = import.meta.env.PROD
    ? "https://api.developernetwork.net/api/v1"
    : "http://localhost:8080/api/v1";

type SessionExpiredHandler = () => void;
let _onSessionExpired: SessionExpiredHandler | null = null;

export const registerSessionExpiredHandler = (
    handler: SessionExpiredHandler,
): void => {
    _onSessionExpired = handler;
};

interface ApiOptions extends RequestInit {
    isPublic?: boolean;
    _retry?: boolean;
    contentType?: boolean;
}

let isRefreshing = false;
let failedQueue: Array<{
    resolve: (token: string | null) => void;
    reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) prom.reject(error);
        else prom.resolve(token);
    });
    failedQueue = [];
};

const attemptTokenRefresh = async (): Promise<string | null> => {
    try {
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
            method: "POST",
            credentials: "include",
        });

        if (refreshRes.ok) {
            const refreshBody = await refreshRes.json();
            const newAccessToken = refreshBody.data?.accessToken;
            if (newAccessToken) {
                localStorage.setItem("access_token", newAccessToken);
                return newAccessToken;
            }
        }
    } catch {
        // network error — fall through
    }
    return null;
};

export const apiClient = async <T>(
    endpoint: string,
    options: ApiOptions = {},
): Promise<T> => {
    const {
        isPublic = false,
        _retry = false,
        contentType = true,
        ...fetchOptions
    } = options;
    const token = localStorage.getItem("access_token");

    const headers = new Headers(fetchOptions.headers);

    if (
        contentType &&
        fetchOptions.body &&
        !(fetchOptions.body instanceof FormData)
    ) {
        headers.set("Content-Type", "application/json");
    }

    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...fetchOptions,
        headers,
        credentials: "include",
    });

    if (response.status === 401 && !_retry) {
        // Public endpoints: retry without token so the request succeeds
        // as unauthenticated, then attempt a background refresh.
        if (isPublic) {
            headers.delete("Authorization");
            const retryRes = await fetch(`${BASE_URL}${endpoint}`, {
                ...fetchOptions,
                headers,
                credentials: "include",
            });

            // Background refresh so subsequent authenticated calls work
            attemptTokenRefresh().then((newToken) => {
                if (!newToken) {
                    localStorage.removeItem("access_token");
                    _onSessionExpired?.();
                }
            });

            if (retryRes.status === 204) return {} as T;
            const retryResult = await retryRes.json();
            if (!retryRes.ok) throw retryResult as ApiErrorResponse;
            return (retryResult as ApiResponse<T>).data;
        }

        // Authenticated endpoints: queue behind an in-flight refresh
        if (isRefreshing) {
            return new Promise<string | null>((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            }).then(() => {
                return apiClient<T>(endpoint, { ...options, _retry: true });
            });
        }

        isRefreshing = true;

        const newToken = await attemptTokenRefresh();
        if (newToken) {
            processQueue(null, newToken);
            isRefreshing = false;
            return apiClient<T>(endpoint, { ...options, _retry: true });
        }

        isRefreshing = false;
        processQueue(new Error("Session Expired"), null);
        localStorage.removeItem("access_token");
        _onSessionExpired?.();
        throw new Error("Session Expired");
    }

    if (response.status === 204) {
        return {} as T;
    }

    const result = await response.json();

    if (!response.ok) {
        throw result as ApiErrorResponse;
    }

    return (result as ApiResponse<T>).data;
};

export const api = {
    get: <T>(url: string, options?: ApiOptions) =>
        apiClient<T>(url, { ...options, method: "GET" }),
    post: <T>(url: string, body?: unknown, options?: ApiOptions) =>
        apiClient<T>(url, {
            ...options,
            method: "POST",
            body: body instanceof FormData ? body : JSON.stringify(body),
        }),
    delete: <T>(url: string, options?: ApiOptions) =>
        apiClient<T>(url, { ...options, method: "DELETE" }),
    patch: <T>(url: string, body?: unknown, options?: ApiOptions) =>
        apiClient<T>(url, {
            ...options,
            method: "PATCH",
            body: body instanceof FormData ? body : JSON.stringify(body),
        }),
};
