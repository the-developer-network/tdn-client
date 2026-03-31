import { useState } from "react";
import { useAuthModalStore } from "../../store/auth-modal.store";
import { authApi } from "../../api/auth-api";
import { Button } from "../../../../shared/components/ui/Button";
import { profileApi } from "../../../profile/api/profile.api";
import { useAuthStore } from "../../../../core/auth/auth.store";

export function RecoveryView() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { recoveryToken, setStep, closeModal } = useAuthModalStore();
    const { setAuth, updateUser } = useAuthStore();

    const handleRecover = async () => {
        if (!recoveryToken) return;
        setIsLoading(true);
        try {
            const data = await authApi.recoverAccount(recoveryToken);
            setAuth(data.user, data.accessToken);

            try {
                const profile = await profileApi.getProfile(data.user.username);
                updateUser({
                    fullName: profile.fullName,
                    avatarUrl: profile.avatarUrl,
                });
            } catch (profileErr) {
                console.error("Profile sync failed:", profileErr);
            }

            closeModal();
        } catch (err) {
            console.error("Recovery error:", err);
            setError("Account recovery failed. The link may have expired.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full flex flex-col items-center animate-in fade-in slide-in-from-right-4 duration-300">
            {/* İkon */}
            <div className="w-16 h-16 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-6">
                <svg
                    className="w-8 h-8 text-orange-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                    />
                </svg>
            </div>

            <h2 className="text-2xl font-bold text-white text-center mb-2 tracking-tight">
                Account Pending Deletion
            </h2>
            <p className="text-white/40 text-center text-sm mb-8 max-w-xs leading-relaxed">
                Your account is scheduled for deletion. Would you like to
                recover it and continue where you left off?
            </p>

            {error && (
                <div className="w-full bg-red-500/10 border border-red-500/50 text-red-400 text-sm py-3 px-4 rounded-md mb-4">
                    {error}
                </div>
            )}

            <div className="w-full space-y-3">
                <Button
                    variant="primary"
                    size="full"
                    onClick={handleRecover}
                    disabled={isLoading}
                    className="py-3"
                >
                    {isLoading ? "Recovering..." : "Yes, recover my account"}
                </Button>

                <Button
                    variant="ghost"
                    size="full"
                    onClick={() => setStep("identifier")}
                    disabled={isLoading}
                    className="text-white/40 hover:text-white py-2"
                >
                    No, go back
                </Button>
            </div>

            <p className="text-white/20 text-xs mt-6 text-center">
                This recovery link expires in 15 minutes.
            </p>
        </div>
    );
}
