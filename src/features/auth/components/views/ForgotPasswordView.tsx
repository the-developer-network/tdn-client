import { useState } from "react";
import { useAuthModalStore } from "../../store/auth-modal.store";
import { authApi } from "../../api/auth-api";
import { Button } from "../../../../shared/components/ui/Button";

export function ForgotPasswordView() {
    const { setStep, setIdentifier } = useAuthModalStore();
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleRequestCode = async () => {
        if (!email.includes("@")) return alert("Please enter a valid email.");

        setIsLoading(true);
        try {
            await authApi.forgotPassword(email);
            setIdentifier(email);
            setStep("reset-password");
        } catch {
            alert("Email not found or system error.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full flex flex-col animate-in fade-in duration-300">
            <h2 className="text-2xl font-bold mb-4 text-white text-center">
                Forgot Password?
            </h2>
            <p className="text-white/40 text-center mb-8 text-sm">
                Enter your email address and we'll send you a code to reset your
                password.
            </p>

            <div className="space-y-4">
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@mail.com"
                    className="w-full bg-black border border-white/20 rounded-md p-4 text-white focus:border-blue-500 outline-none transition-all"
                    autoFocus
                />

                <Button
                    variant="primary"
                    size="full"
                    onClick={handleRequestCode}
                    disabled={isLoading || !email}
                >
                    {isLoading ? "Sending..." : "Send Code"}
                </Button>

                <button
                    onClick={() => setStep("login")}
                    className="text-white/40 text-sm hover:text-white w-full py-2"
                >
                    Back to Login
                </button>
            </div>
        </div>
    );
}
