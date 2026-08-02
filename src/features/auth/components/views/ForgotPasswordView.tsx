import { useState } from "react";
import { useAuthModalStore } from "../../store/auth-modal.store";
import { authApi } from "../../api/auth-api";
import { Button } from "../../../../shared/components/ui/Button";
import { useI18n } from "../../../../shared/hooks/useI18n";

export function ForgotPasswordView() {
    const { t } = useI18n();
    const { setStep, setIdentifier } = useAuthModalStore();
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleRequestCode = async () => {
        if (!email.includes("@")) return alert(t("auth.invalidEmail"));

        setIsLoading(true);
        try {
            await authApi.forgotPassword(email);
            setIdentifier(email);
            setStep("reset-password");
        } catch {
            alert(t("auth.emailNotFound"));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full flex flex-col animate-in fade-in duration-300">
            <h2 className="text-2xl font-bold mb-4 text-white text-center">
                {t("auth.forgotTitle")}
            </h2>
            <p className="text-white/40 text-center mb-8 text-sm">
                {t("auth.forgotSubtitle")}
            </p>

            <div className="space-y-4">
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("auth.forgotEmailPlaceholder")}
                    className="w-full bg-black border border-white/20 rounded-md p-4 text-white focus:border-blue-500 outline-none transition-all"
                    autoFocus
                />

                <Button
                    variant="primary"
                    size="full"
                    onClick={handleRequestCode}
                    disabled={isLoading || !email}
                >
                    {isLoading ? t("auth.sending") : t("auth.sendCode")}
                </Button>

                <button
                    onClick={() => setStep("login")}
                    className="text-white/40 text-sm hover:text-white w-full py-2"
                >
                    {t("auth.backToLogin")}
                </button>
            </div>
        </div>
    );
}
