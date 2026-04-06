export interface AccountInfo {
    id: string;
    username: string;
    email: string;
    isEmailVerified: boolean;
    providers: string[];
    createdAt: string;
    updatedAt: string;
}

export interface UpdateUsernameBody {
    newUsername: string;
}

export interface UpdateEmailBody {
    newEmail: string;
}

export interface UpdatePasswordBody {
    currentPassword: string;
    newPassword: string;
}
