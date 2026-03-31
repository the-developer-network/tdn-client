import { create } from "zustand";

export type AuthStep =
    | "initial"
    | "identifier"
    | "login"
    | "register"
    | "verify-email"
    | "forgot-password"
    | "reset-password"
    | "account-recovery";

interface AuthModalState {
    isOpen: boolean;
    step: AuthStep;
    identifier: string;
    recoveryToken: string | null;

    openModal: (step?: AuthStep) => void;
    closeModal: () => void;
    setStep: (step: AuthStep) => void;
    setIdentifier: (value: string) => void;
    setRecoveryToken: (token: string) => void;
    reset: () => void;
}

export const useAuthModalStore = create<AuthModalState>((set) => ({
    isOpen: false,
    step: "initial",
    identifier: "",
    recoveryToken: null,

    openModal: (step = "initial") => set({ isOpen: true, step }),

    closeModal: () => {
        set({ isOpen: false });
        setTimeout(
            () => set({ step: "initial", identifier: "", recoveryToken: null }),
            300,
        );
    },

    setStep: (step) => set({ step }),

    setIdentifier: (identifier) => set({ identifier }),

    setRecoveryToken: (token) => set({ recoveryToken: token }),
    reset: () =>
        set({
            step: "initial",
            identifier: "",
            isOpen: false,
            recoveryToken: null,
        }),
}));
