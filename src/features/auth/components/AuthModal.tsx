import { useAuthModalStore } from "../store/auth-modal.store";
import { Modal } from "../../../shared/components/ui/Modal";
import { IdentifierView } from "./views/IdentifierView";
import { LoginView } from "./views/LoginView";
import logo from "../../../shared/assets/images/logo.png";
import { RegisterView } from "./views/RegisterView";
import { VerifyEmailView } from "./views/VerifyEmailView";
import { ForgotPasswordView } from "./views/ForgotPasswordView";
import { ResetPasswordView } from "./views/ResetPasswordView";
import { RecoveryView } from "./views/RecoveryView";

export function AuthModal() {
    const { isOpen, closeModal, step } = useAuthModalStore();

    const renderContent = () => {
        switch (step) {
            case "login":
                return <LoginView />;
            case "register":
                return <RegisterView />;
            case "verify-email":
                return <VerifyEmailView />;
            case "forgot-password":
                return <ForgotPasswordView />;
            case "reset-password":
                return <ResetPasswordView />;
            case "account-recovery":
                return <RecoveryView />;
            case "identifier":
            default:
                return <IdentifierView />;
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={closeModal}>
            <div className="flex flex-col items-center px-8 md:px-12 py-10 min-h-[450px]">
                <img src={logo} alt="TDN" className="h-8 w-auto mb-10" />
                <div className="w-full">{renderContent()}</div>
            </div>
        </Modal>
    );
}
