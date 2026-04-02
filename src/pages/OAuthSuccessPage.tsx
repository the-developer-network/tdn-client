import { useEffect } from "react";
import { AuthModal } from "../features/auth/components/AuthModal";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthModalStore } from "../features/auth/store/auth-modal.store";
import { profileApi } from "../features/profile/api/profile.api";
import { decodeToken } from "../shared/utils/jwt";
import { useAuthStore } from "../core/auth/auth.store";

export default function OAuthSuccess() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { openModal, setRecoveryToken } = useAuthModalStore();
    const { setAuth, updateUser } = useAuthStore();

    const token = searchParams.get("token");
    const error = searchParams.get("error");
    const recoveryToken = searchParams.get("recoveryToken");
    const refreshToken = searchParams.get("refreshToken");

    useEffect(() => {
        if (token) {
            localStorage.setItem("access_token", token);

            if (refreshToken) {
                localStorage.setItem("refresh_token", refreshToken);
            }

            const handleAuthentication = async () => {
                const decoded = decodeToken<{ id: string; username: string }>(
                    token,
                );

                if (decoded?.id && decoded?.username) {
                    setAuth(
                        {
                            id: decoded.id,
                            username: decoded.username,
                            isEmailVerified: true,
                        },
                        token,
                    );

                    try {
                        const profileData = await profileApi.getProfile(
                            decoded.username,
                        );

                        updateUser({
                            fullName: profileData.fullName,
                            avatarUrl: profileData.avatarUrl,
                        });
                    } catch (error) {
                        console.error("Hydration error:", error);
                    }

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
        token,
        error,
        recoveryToken,
        refreshToken,
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
