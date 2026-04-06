import { api } from "../../../core/api/client";
import type {
    AccountInfo,
    UpdateUsernameBody,
    UpdateEmailBody,
    UpdatePasswordBody,
} from "./settings.types";

export const settingsApi = {
    getAccountInfo: () => api.get<AccountInfo>("/users/me"),

    updateUsername: (body: UpdateUsernameBody) =>
        api.patch<null>("/users/me/username", body),

    updateEmail: (body: UpdateEmailBody) =>
        api.patch<null>("/users/me/email", body),

    updatePassword: (body: UpdatePasswordBody) =>
        api.patch<null>("/users/me/password", body),

    deleteAccount: () => api.delete<null>("/users/me"),
};
