import { useEffect } from "react";
import { AuthModal } from "../features/auth/components/AuthModal";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthModalStore } from "../features/auth/store/auth-modal.store";

export default function OAuthSuccess() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { openModal, setRecoveryToken } = useAuthModalStore();

    const token = searchParams.get("token");
    const error = searchParams.get("error");
    const recoveryToken = searchParams.get("recoveryToken");

    useEffect(() => {
        if (token) {
            localStorage.setItem("access_token", token);
            navigate("/", { replace: true });
        } else if (error === "account_pending_deletion" && recoveryToken) {
            setRecoveryToken(recoveryToken);
            openModal("account-recovery");
        } else {
            navigate("/", { replace: true });
        }
    }, [token, error, recoveryToken, navigate, openModal, setRecoveryToken]);
    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-white/10 border-t-white rounded-full animate-spin" />
                <p className="text-white/40 font-medium animate-pulse text-sm">
                    Synchronizing account...
                </p>
            </div>
            <AuthModal />
        </div>
    );
}
