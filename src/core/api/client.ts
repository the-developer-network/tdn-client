import { NetworkError } from "./api-types";
import type { ApiErrorResponse, ApiResponse } from "./api-types";

const REQUEST_TIMEOUT_MS = 15_000;

export const BASE_URL = import.meta.env.PROD
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
    /**
     * Readable with or without a session. A 401 means the token is stale, so
     * the request is replayed anonymously and a refresh runs in the
     * background — the content still arrives, just unauthenticated.
     */
    isPublic?: boolean;
    /**
     * Called to obtain a session rather than with one: login, register,
     * password reset, account recovery, OAuth exchange. No token is sent, and
     * a 401 is the endpoint's own answer — "those credentials are wrong" —
     * not a stale session. It is handed to the caller untouched, with no
     * replay and no refresh.
     */
    isAnonymous?: boolean;
    _retry?: boolean;
    contentType?: boolean;
}

let isRefreshing = false;

/**
 * The in-flight refresh, shared by every caller that needs one.
 *
 * The queue below serialises *authenticated* retries, but the public branch
 * used to call `attemptTokenRefresh` directly and so escaped it entirely.
 * Opening an article fires several public reads at once — the article, its
 * comments, the trending rail — and with a stale token each one asked for its
 * own refresh. That spends a five-a-minute budget three at a time, and where
 * the refresh token rotates, the later calls present one the first has
 * already consumed: they fail, and a failed refresh signs the reader out.
 */
let refreshPromise: Promise<string | null> | null = null;
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

/**
 * Every request leaves through here so the 15 s budget and the `NetworkError`
 * wrapping apply to all of them. Calling `fetch` directly skips both: the
 * request can hang indefinitely, and a connection failure surfaces as a raw
 * `TypeError`, which `getErrorMessage` reports as "an unexpected error"
 * instead of a connection problem.
 */
const fetchWithTimeout = async (
    endpoint: string,
    init: RequestInit = {},
): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        return await fetch(`${BASE_URL}${endpoint}`, {
            ...init,
            credentials: "include",
            signal: controller.signal,
        });
    } catch (err) {
        const isAbort =
            err instanceof DOMException && err.name === "AbortError";
        throw new NetworkError(
            isAbort ? "Request timed out" : "Network request failed",
        );
    } finally {
        clearTimeout(timeoutId);
    }
};

const attemptTokenRefresh = async (): Promise<string | null> => {
    try {
        // A hang here would leave `isRefreshing` true forever and strand every
        // queued request, so this needs the timeout more than most.
        const refreshRes = await fetchWithTimeout("/auth/refresh", {
            method: "POST",
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

const refreshOnce = (): Promise<string | null> => {
    if (!refreshPromise) {
        refreshPromise = attemptTokenRefresh().finally(() => {
            refreshPromise = null;
        });
    }
    return refreshPromise;
};

export const apiClient = async <T>(
    endpoint: string,
    options: ApiOptions = {},
): Promise<T> => {
    const {
        isPublic = false,
        isAnonymous = false,
        _retry = false,
        contentType = true,
        ...fetchOptions
    } = options;
    const token = isAnonymous ? null : localStorage.getItem("access_token");

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

    const response = await fetchWithTimeout(endpoint, {
        ...fetchOptions,
        headers,
    });

    // A public request that carried no token was already anonymous, so its
    // 401 is the endpoint's own answer rather than a stale session. Retrying
    // it unchanged only repeats the same failure, and renewing a session that
    // was never opened ends by reporting it expired — which puts the sign-in
    // modal in front of a reader who never signed in.
    const isStaleSession =
        response.status === 401 &&
        !_retry &&
        !isAnonymous &&
        !(isPublic && !token);

    // `isAnonymous` endpoints answer 401 to mean "wrong credentials", so the
    // whole recovery apparatus below is skipped and the problem document
    // falls through to the caller.
    if (isStaleSession) {
        // Public endpoints: retry without token so the request succeeds
        // as unauthenticated, then attempt a background refresh.
        if (isPublic) {
            headers.delete("Authorization");
            const retryRes = await fetchWithTimeout(endpoint, {
                ...fetchOptions,
                headers,
            });

            // Background refresh so subsequent authenticated calls work.
            // Shared with every other caller, so a page full of public reads
            // renews the session once rather than once each.
            refreshOnce().then((newToken) => {
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

        const newToken = await refreshOnce();
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
