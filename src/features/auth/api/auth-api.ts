import { api } from "../../../core/api/client";
import type {
    OAuthExchangeBody,
    RegisterBody,
    ResetPasswordBody,
} from "./auth-api-body-types";
import type {
    CheckResponse,
    LoginResponse,
    RegisterResponse,
} from "./auth-api-response.types";

/**
 * Everything here except `sendVerification`, `verifyEmail` and `logout` runs
 * before there is a session, so it is `isAnonymous` rather than `isPublic`:
 * a 401 from these endpoints is their verdict on the credentials supplied,
 * and must not be mistaken for a token that needs refreshing.
 */
export const authApi = {
    checkIdentifier: (identifier: string) =>
        api.post<CheckResponse>(
            "/auth/check",
            { identifier },
            { isAnonymous: true },
        ),

    login: (identifier: string, password: string) =>
        api.post<LoginResponse>(
            "/auth/login",
            { identifier, password },
            { isAnonymous: true },
        ),

    register: (payload: RegisterBody) =>
        api.post<RegisterResponse>("/auth/register", payload, {
            isAnonymous: true,
        }),

    sendVerification: () => api.post<void>("/auth/send-verification"),

    verifyEmail: (otp: string) =>
        api.post<{ verified: boolean }>("/auth/verify-email", { otp }),

    forgotPassword: (email: string) =>
        api.post<void>(
            "/auth/forgot-password",
            { email },
            { isAnonymous: true },
        ),

    resetPassword: (payload: ResetPasswordBody) =>
        api.post<void>("/auth/reset-password", payload, { isAnonymous: true }),

    logout: () => api.post("/auth/logout", undefined, { contentType: false }),

    recoverAccount: (recoveryToken: string) =>
        api.post<LoginResponse>(
            "/auth/recover-account",
            { recoveryToken },
            { isAnonymous: true },
        ),

    exchangeCode: (payload: OAuthExchangeBody) =>
        api.post<LoginResponse>("/oauth/exchange", payload, {
            isAnonymous: true,
        }),
};
