import { create } from "zustand";

type AuthStep = "initial" | "login" | "register" | "verify";

interface AuthModalState {
    isOpen: boolean;
    step: AuthStep;
    openModal: (step?: AuthStep) => void;
    closeModal: () => void;
    setStep: (step: AuthStep) => void;
}

export const useAuthModalStore = create<AuthModalState>((set) => ({
    isOpen: false,
    step: "initial",
    openModal: (step = "initial") => set({ isOpen: true, step }),
    closeModal: () => set({ isOpen: false, step: "initial" }),
    setStep: (step) => set({ step }),
}));
