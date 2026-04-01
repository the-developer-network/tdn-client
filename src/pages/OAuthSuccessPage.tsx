import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../core/auth/auth.store";
import { useAuthModalStore } from "../features/auth/store/auth-modal.store";
import { decodeToken } from "../shared/utils/jwt";
import { profileApi } from "../features/profile/api/profile.api";

export default function OAuthSuccessPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { setAuth, updateUser } = useAuthStore();
    const { openModal, setRecoveryToken, setStep } = useAuthModalStore();

    useEffect(() => {
        const token = searchParams.get("token");
        const error = searchParams.get("error");
        const recoveryToken = searchParams.get("recoveryToken");

        const handleAuthentication = async () => {
            if (error === "account_pending_deletion" && recoveryToken) {
                setRecoveryToken(recoveryToken);
                setStep("account-recovery");
                openModal("account-recovery");
                navigate("/", { replace: true });
                return;
            }

            if (!token) {
                navigate("/?error=missing_token", { replace: true });
                return;
            }

            const decoded = decodeToken<{ id: string; username: string }>(
                token,
            );

            if (!decoded?.id || !decoded?.username) {
                navigate("/?error=invalid_token_payload", { replace: true });
                return;
            }

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
            } catch (err) {
                console.error(
                    "Profile hydration failed, continuing with minimal data:",
                    err,
                );
            }

            navigate("/", { replace: true });
        };

        handleAuthentication();
    }, [
        searchParams,
        setAuth,
        updateUser,
        navigate,
        openModal,
        setRecoveryToken,
        setStep,
    ]);

    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-black">
            <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-blue-500" />
            </div>
            <p className="text-white font-medium mt-6 animate-pulse">
                Setting up your profile...
            </p>
        </div>
    );
}
