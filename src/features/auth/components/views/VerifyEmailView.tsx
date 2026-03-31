import { useState, useEffect } from "react";
import { useAuthModalStore } from "../../store/auth-modal.store";
import { authApi } from "../../api/auth-api";
import { useAuthStore } from "../../../../core/auth/auth.store";
import { Button } from "../../../../shared/components/ui/Button";

export function VerifyEmailView() {
    const [code, setCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const { closeModal } = useAuthModalStore();
    const { updateUser } = useAuthStore();

    useEffect(() => {
        authApi
            .sendVerification()
            .catch((err) => console.error("Initial send failed:", err));
    }, []);

    const handleVerify = async () => {
        if (code.length < 8) return;
        setIsLoading(true);
        try {
            const data = await authApi.verifyEmail(code);
            if (data.verified) {
                updateUser({ isEmailVerified: true });
                closeModal();
            }
        } catch {
            alert("Invalid verification code. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        setIsResending(true);
        try {
            await authApi.sendVerification();
            alert("A new code has been sent to your email.");
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="w-full flex flex-col animate-in fade-in zoom-in duration-300 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white tracking-tight">
                Check your email
            </h2>
            <p className="text-white/60 mb-8 text-sm leading-relaxed">
                We sent an 8-digit verification code to your inbox. <br />
                Enter it below to verify your account.
            </p>

            <div className="space-y-6">
                <input
                    type="text"
                    maxLength={8}
                    value={code}
                    onChange={(e) =>
                        setCode(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    placeholder="00000000"
                    className="w-full bg-black border border-white/20 rounded-md p-5 text-center text-2xl font-mono tracking-[0.5em] text-white focus:border-blue-500 outline-none transition-all placeholder:text-white/10"
                    autoFocus
                />

                <div className="flex flex-col gap-3">
                    <Button
                        variant="primary"
                        size="full"
                        className="py-3.5"
                        onClick={handleVerify}
                        disabled={isLoading || code.length !== 8}
                    >
                        {isLoading ? "Verifying..." : "Verify Email"}
                    </Button>

                    <Button
                        variant="ghost"
                        size="full"
                        className="text-white/40 hover:text-white"
                        onClick={closeModal}
                    >
                        Skip for now
                    </Button>
                </div>

                <button
                    disabled={isResending}
                    onClick={handleResend}
                    className="text-blue-500 text-sm hover:underline disabled:opacity-50"
                >
                    {isResending
                        ? "Sending..."
                        : "Didn't receive a code? Resend"}
                </button>
            </div>
        </div>
    );
}
