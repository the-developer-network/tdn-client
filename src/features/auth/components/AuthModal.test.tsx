import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthModalStore } from "../store/auth-modal.store";
import { AuthModal } from "./AuthModal";

// Replace every view sub-component with a uniquely identifiable stub so we can
// assert which one AuthModal renders for each step — without needing to mount
// the full form views (which have their own API and store dependencies).
vi.mock("./views/IdentifierView", () => ({
    IdentifierView: () => <div>identifier-view</div>,
}));
vi.mock("./views/LoginView", () => ({
    LoginView: () => <div>login-view</div>,
}));
vi.mock("./views/RegisterView", () => ({
    RegisterView: () => <div>register-view</div>,
}));
vi.mock("./views/VerifyEmailView", () => ({
    VerifyEmailView: () => <div>verify-email-view</div>,
}));
vi.mock("./views/ForgotPasswordView", () => ({
    ForgotPasswordView: () => <div>forgot-password-view</div>,
}));
vi.mock("./views/ResetPasswordView", () => ({
    ResetPasswordView: () => <div>reset-password-view</div>,
}));
vi.mock("./views/RecoveryView", () => ({
    RecoveryView: () => <div>account-recovery-view</div>,
}));

beforeEach(() => {
    // auth-modal.store has no persist middleware — a plain reset() is enough.
    useAuthModalStore.getState().reset();
});

describe("AuthModal", () => {
    it("renders nothing when isOpen is false", () => {
        useAuthModalStore.setState({ isOpen: false });
        const { container } = render(<AuthModal />);
        expect(container.firstChild).toBeNull();
    });

    it("renders LoginView when step is 'login'", () => {
        useAuthModalStore.setState({ isOpen: true, step: "login" });
        render(<AuthModal />);
        expect(screen.getByText("login-view")).toBeInTheDocument();
    });

    it("renders RegisterView when step is 'register'", () => {
        useAuthModalStore.setState({ isOpen: true, step: "register" });
        render(<AuthModal />);
        expect(screen.getByText("register-view")).toBeInTheDocument();
    });

    it("renders VerifyEmailView when step is 'verify-email'", () => {
        useAuthModalStore.setState({ isOpen: true, step: "verify-email" });
        render(<AuthModal />);
        expect(screen.getByText("verify-email-view")).toBeInTheDocument();
    });
});
