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

export const authApi = {
    checkIdentifier: (identifier: string) =>
        api.post<CheckResponse>("/auth/check", { identifier }),

    login: (identifier: string, password: string) =>
        api.post<LoginResponse>("/auth/login", {
            identifier,
            password,
        }),

    register: (payload: RegisterBody) =>
        api.post<RegisterResponse>("/auth/register", payload),

    sendVerification: () => api.post<void>("/auth/send-verification"),

    verifyEmail: (otp: string) =>
        api.post<{ verified: boolean }>("/auth/verify-email", { otp }),

    forgotPassword: (email: string) =>
        api.post<void>("/auth/forgot-password", { email }),

    resetPassword: (payload: ResetPasswordBody) =>
        api.post<void>("/auth/reset-password", payload),

    logout: () => api.post("/auth/logout", undefined, { contentType: false }),

    recoverAccount: (recoveryToken: string) =>
        api.post<LoginResponse>(
            "/auth/recover-account",
            { recoveryToken },
            { isPublic: true },
        ),

    exchangeCode: (payload: OAuthExchangeBody) =>
        api.post<LoginResponse>("/oauth/exchange", payload, {
            isPublic: true,
        }),
};
