export interface RegisterBody {
    email: string;
    username: string;
    password?: string;
}

export interface ResetPasswordBody {
    email: string;
    otp: string;
    newPassword: string;
}
