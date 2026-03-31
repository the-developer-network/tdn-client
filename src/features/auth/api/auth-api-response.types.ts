export interface RegisterResponse {
    id: string;
    username: string;
    createdAt: string;
}

export interface CheckResponse {
    check: boolean;
}

export interface LoginResponse {
    accessToken: string;
    expiresAt: number;
    user: {
        id: string;
        username: string;
        isEmailVerified: boolean;
    };
}
