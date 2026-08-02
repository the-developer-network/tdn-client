import { useState } from "react";
import { useAuthModalStore } from "../../store/auth-modal.store";
import { authApi } from "../../api/auth-api";
import { Button } from "../../../../shared/components/ui/Button";
import { getErrorMessage } from "../../../../shared/utils/error-handler";
import { useI18n } from "../../../../shared/hooks/useI18n";

export function ForgotPasswordView() {
    const { t } = useI18n();
    const { setStep, setIdentifier } = useAuthModalStore();
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRequestCode = async () => {
        if (!email.includes("@")) {
            setError(t("auth.invalidEmail"));
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            await authApi.forgotPassword(email);
            // The API answers 204 whether or not the address is registered, so
            // there is nothing here to branch on — and nothing to leak.
            setIdentifier(email);
            setStep("reset-password");
        } catch (err) {
            setError(getErrorMessage(err));
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

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    void handleRequestCode();
                }}
                // Native constraint validation on the `type="email"` field
                // would block submit and answer with an unstyled, separately
                // localised bubble. This screen reports in its own voice.
                noValidate
                className="space-y-4"
            >
                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm py-3 px-4 rounded-md">
                        {error}
                    </div>
                )}

                <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError(null);
                    }}
                    placeholder={t("auth.forgotEmailPlaceholder")}
                    autoComplete="email"
                    className="w-full bg-black border border-white/20 rounded-md p-4 text-white focus:border-blue-500 outline-none transition-all"
                    autoFocus
                />

                {/* `Button` sets no default type, so inside a form it submits
                    unless it says otherwise. */}
                <Button
                    type="submit"
                    variant="primary"
                    size="full"
                    disabled={isLoading || !email}
                >
                    {isLoading ? t("auth.sending") : t("auth.sendCode")}
                </Button>

                <button
                    type="button"
                    onClick={() => setStep("login")}
                    className="text-white/40 text-sm hover:text-white w-full py-2"
                >
                    {t("auth.backToLogin")}
                </button>
            </form>
        </div>
    );
}
