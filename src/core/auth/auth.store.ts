import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi } from "../../features/auth/api/auth-api";

interface AuthPayload {
    id: string;
    username: string;
    isEmailVerified: boolean;
}

interface User extends AuthPayload {
    fullName?: string;
    avatarUrl?: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    setAuth: (payload: AuthPayload, token: string) => void;
    updateUser: (details: Partial<User>) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,

            setAuth: (payload, token) => {
                localStorage.setItem("access_token", token);
                set({ user: payload, token, isAuthenticated: true });
            },

            updateUser: (details) => {
                set((state) => ({
                    user: state.user ? { ...state.user, ...details } : null,
                }));
            },

            logout: async () => {
                try {
                    await authApi.logout();
                } catch (err) {
                    console.error(err);
                } finally {
                    localStorage.removeItem("access_token");
                    set({ user: null, token: null, isAuthenticated: false });
                }
            },
        }),
        {
            name: "tdn-auth-storage",
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
            }),
        },
    ),
);
