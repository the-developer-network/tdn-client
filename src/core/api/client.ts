import type { ApiErrorResponse, ApiResponse } from "./api-types";

const BASE_URL = "https://api.developernetwork.net/api/v1";

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

    if (response.status === 401 && !isPublic && !_retry) {
        if (isRefreshing) {
            return new Promise<string | null>((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            }).then(() => {
                return apiClient<T>(endpoint, { ...options, _retry: true });
            });
        }

        isRefreshing = true;

        const storedRefreshToken = localStorage.getItem("refresh_token");

        try {
            const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
                method: "POST",
                headers: storedRefreshToken
                    ? { "Content-Type": "application/json" }
                    : {},
                body: storedRefreshToken
                    ? JSON.stringify({ refreshToken: storedRefreshToken })
                    : undefined,
                credentials: "include",
            });

            if (refreshRes.ok) {
                const refreshBody = await refreshRes.json();
                const newAccessToken = refreshBody.data?.accessToken;
                if (newAccessToken) {
                    localStorage.setItem("access_token", newAccessToken);
                    processQueue(null, newAccessToken);
                    isRefreshing = false;
                    return apiClient<T>(endpoint, { ...options, _retry: true });
                }
            }
        } catch {
            // network error or non-JSON body — fall through to session expiry
        }

        isRefreshing = false;
        processQueue(new Error("Session Expired"), null);
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
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
};
