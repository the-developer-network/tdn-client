import { useEffect } from "react";
import { AuthModal } from "../features/auth/components/AuthModal";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthModalStore } from "../features/auth/store/auth-modal.store";
import { profileApi } from "../features/profile/api/profile.api";
import { useAuthStore } from "../core/auth/auth.store";
import { authApi } from "../features/auth/api/auth-api";

export default function OAuthSuccess() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { openModal, setRecoveryToken } = useAuthModalStore();
    const { setAuth, updateUser } = useAuthStore();

    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const recoveryToken = searchParams.get("recoveryToken");

    useEffect(() => {
        if (code) {
            const handleAuthentication = async () => {
                try {
                    const response = await authApi.exchangeCode({ code });

                    setAuth(
                        {
                            id: response.user.id,
                            username: response.user.username,
                            isEmailVerified: response.user.isEmailVerified,
                        },
                        response.accessToken,
                    );

                    try {
                        const profileData = await profileApi.getProfile(
                            response.user.username,
                        );

                        updateUser({
                            fullName: profileData.fullName,
                            avatarUrl: profileData.avatarUrl,
                        });
                    } catch (err) {
                        console.error("Hydration error:", err);
                    }

                    navigate("/", { replace: true });
                } catch (err) {
                    console.error("OAuth exchange error:", err);
                    navigate("/", { replace: true });
                }
            };
            handleAuthentication();
        } else if (error === "account_pending_deletion" && recoveryToken) {
            setRecoveryToken(recoveryToken);
            openModal("account-recovery");
        } else {
            navigate("/", { replace: true });
        }
    }, [
        code,
        error,
        recoveryToken,
        navigate,
        openModal,
        setRecoveryToken,
        setAuth,
        updateUser,
    ]);
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
