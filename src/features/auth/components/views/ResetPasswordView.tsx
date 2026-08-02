import { useState } from "react";
import { useAuthModalStore } from "../../store/auth-modal.store";
import { authApi } from "../../api/auth-api";
import { Button } from "../../../../shared/components/ui/Button";
import { useToastStore } from "../../../../shared/store/toast.store";
import { getErrorMessage } from "../../../../shared/utils/error-handler";
import { useI18n } from "../../../../shared/hooks/useI18n";

/** `POST /auth/reset-password` takes a code of exactly this length. */
const OTP_LENGTH = 8;

/** The shortest password the API will accept. */
const MIN_PASSWORD_LENGTH = 8;

export function ResetPasswordView() {
    const { t } = useI18n();
    const { identifier, setStep } = useAuthModalStore();
    const { addToast } = useToastStore();
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleReset = async () => {
        // Both of these are schema constraints on the endpoint. Checking them
        // here keeps a doomed request off the wire and, more importantly, lets
        // the view name the actual problem — the server answers a short
        // password with a validation error the user would read as a bad code.
        if (otp.length !== OTP_LENGTH) {
            setError(t("auth.otpLengthError"));
            return;
        }

        if (newPassword.length < MIN_PASSWORD_LENGTH) {
            setError(t("auth.passwordTooShort"));
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            await authApi.resetPassword({
                email: identifier,
                otp,
                newPassword,
            });
            addToast({ type: "success", message: t("auth.resetSuccess") });
            setStep("login");
        } catch (err) {
            // The API distinguishes an expired code from an account that has
            // no password at all (Google, GitHub). Reporting either one as
            // "invalid code" sends the user back to retype a code that was
            // never the problem.
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-bold mb-2 text-white text-center">
                {t("auth.resetTitle")}
            </h2>
            <p className="text-white/40 text-center mb-8 text-sm">
                {t("auth.resetSubtitle")} <b>{identifier}</b>
            </p>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    void handleReset();
                }}
                className="space-y-4"
            >
                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm py-3 px-4 rounded-md">
                        {error}
                    </div>
                )}

                <input
                    type="text"
                    value={otp}
                    // Codes are copied out of an email, and the copy usually
                    // brings whitespace with it that the schema rejects.
                    onChange={(e) => {
                        setOtp(e.target.value.replace(/\s/g, ""));
                        if (error) setError(null);
                    }}
                    maxLength={OTP_LENGTH}
                    placeholder={t("auth.otpPlaceholder")}
                    autoComplete="one-time-code"
                    className="w-full bg-black border border-white/20 rounded-md p-4 text-center font-mono text-xl text-white focus:border-blue-500 outline-none"
                    autoFocus
                />

                <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (error) setError(null);
                    }}
                    placeholder={t("auth.newPasswordPlaceholder")}
                    autoComplete="new-password"
                    className="w-full bg-black border border-white/20 rounded-md p-4 text-white focus:border-blue-500 outline-none"
                />

                {/* `Button` sets no default type, so inside a form it submits
                    unless it says otherwise. */}
                <Button
                    type="submit"
                    variant="primary"
                    size="full"
                    disabled={isLoading || !otp || !newPassword}
                >
                    {isLoading ? t("auth.resetting") : t("auth.updatePassword")}
                </Button>
            </form>
        </div>
    );
}
