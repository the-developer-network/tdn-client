import { api } from "../../../core/api/client";
import type {
    AccountInfo,
    UpdateUsernameBody,
    UpdateEmailBody,
    UpdatePasswordBody,
    DeleteAccountBody,
} from "./settings.types";

export const settingsApi = {
    getAccountInfo: () => api.get<AccountInfo>("/users/me"),

    updateUsername: (body: UpdateUsernameBody) =>
        api.patch<null>("/users/me/username", body),

    updateEmail: (body: UpdateEmailBody) =>
        api.patch<null>("/users/me/email", body),

    updatePassword: (body: UpdatePasswordBody) =>
        api.patch<null>("/users/me/password", body),

    // The account is only soft-deleted after the password is re-verified, so
    // DELETE /users/me carries a body — omitting it is rejected as invalid.
    deleteAccount: (body: DeleteAccountBody) =>
        api.delete<null>("/users/me", { body: JSON.stringify(body) }),
};
