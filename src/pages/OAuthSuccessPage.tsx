import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../core/auth/auth.store";
import { decodeToken } from "../shared/utils/jwt";
import { profileApi } from "../features/profile/api/profile.api";

export default function OAuthSuccessPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { setAuth, updateUser } = useAuthStore();

    useEffect(() => {
        const token = searchParams.get("token");

        const handleAuthentication = async () => {
            if (!token) {
                navigate("/?error=missing_token");
                return;
            }

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
                    console.error(
                        "Hydration failed, continuing with minimal data:",
                        error,
                    );
                }

                navigate("/", { replace: true });
            } else {
                navigate("/?error=invalid_token_payload");
            }
        };

        handleAuthentication();
    }, [searchParams, setAuth, updateUser, navigate]);

    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-black">
            <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-blue-500"></div>
            </div>
            <p className="text-white font-medium mt-6 animate-pulse">
                Setting up your profile...
            </p>
        </div>
    );
}
