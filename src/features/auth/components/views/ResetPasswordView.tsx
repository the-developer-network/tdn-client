import { useState } from "react";
import { useAuthModalStore } from "../../store/auth-modal.store";
import { authApi } from "../../api/auth-api";
import { Button } from "../../../../shared/components/ui/Button";

export function ResetPasswordView() {
    const { identifier, setStep } = useAuthModalStore();
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleReset = async () => {
        if (otp.length < 7) return;

        setIsLoading(true);
        try {
            await authApi.resetPassword({
                email: identifier,
                otp,
                newPassword,
            });
            alert("Your password has been reset successfully.");
            setStep("login");
        } catch {
            alert("Invalid code or request failed.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-bold mb-2 text-white text-center">
                Reset Password
            </h2>
            <p className="text-white/40 text-center mb-8 text-sm">
                Check your inbox for the code sent to <b>{identifier}</b>
            </p>

            <div className="space-y-4">
                <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter OTP Code"
                    className="w-full bg-black border border-white/20 rounded-md p-4 text-center font-mono text-xl text-white focus:border-blue-500 outline-none"
                />

                <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New Password"
                    className="w-full bg-black border border-white/20 rounded-md p-4 text-white focus:border-blue-500 outline-none"
                />

                <Button
                    variant="primary"
                    size="full"
                    onClick={handleReset}
                    disabled={isLoading || !otp || !newPassword}
                >
                    {isLoading ? "Resetting..." : "Update Password"}
                </Button>
            </div>
        </div>
    );
}
