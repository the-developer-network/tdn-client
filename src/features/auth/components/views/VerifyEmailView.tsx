import { useState, useEffect, useRef } from "react";
import { useAuthModalStore } from "../../store/auth-modal.store";
import { authApi } from "../../api/auth-api";
import { useAuthStore } from "../../../../core/auth/auth.store";
import { Button } from "../../../../shared/components/ui/Button";
import { getErrorMessage } from "../../../../shared/utils/error-handler";
import { useI18n } from "../../../../shared/hooks/useI18n";

export function VerifyEmailView() {
    const { t } = useI18n();
    const [code, setCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const { closeModal } = useAuthModalStore();
    const { updateUser } = useAuthStore();

    // StrictMode runs mount effects twice in development, which would send the
    // user two codes and spend their rate-limit budget doing it.
    const hasRequestedCode = useRef(false);

    useEffect(() => {
        if (hasRequestedCode.current) return;
        hasRequestedCode.current = true;

        authApi.sendVerification().catch((err) => {
            setError(getErrorMessage(err));
        });
    }, []);

    const handleVerify = async () => {
        if (code.length < 8) return;
        setIsLoading(true);
        setError(null);
        setNotice(null);
        try {
            await authApi.verifyEmail(code);
            updateUser({ isEmailVerified: true });
            closeModal();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        setIsResending(true);
        setError(null);
        setNotice(null);
        try {
            await authApi.sendVerification();
            setNotice(t("auth.codeResent"));
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="w-full flex flex-col animate-in fade-in zoom-in duration-300 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-ink tracking-tight">
                {t("auth.verifyTitle")}
            </h2>
            <p className="text-ink/60 mb-8 text-sm leading-relaxed">
                {t("auth.verifySubtitle")}
            </p>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    void handleVerify();
                }}
                className="space-y-6"
            >
                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm py-3 px-4 rounded-md">
                        {error}
                    </div>
                )}
                {notice && <p className="text-sm text-green-400">{notice}</p>}

                <input
                    type="text"
                    maxLength={8}
                    value={code}
                    onChange={(e) =>
                        setCode(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    placeholder="00000000"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="w-full bg-ground border border-ink/20 rounded-md p-5 text-center text-2xl font-mono tracking-[0.5em] text-ink focus:border-blue-500 outline-none transition-all placeholder:text-ink/10"
                    autoFocus
                />

                <div className="flex flex-col gap-3">
                    {/* `Button` sets no default type, so inside a form every one
                        of them submits unless it says otherwise. */}
                    <Button
                        type="submit"
                        variant="primary"
                        size="full"
                        className="py-3.5"
                        disabled={isLoading || code.length !== 8}
                    >
                        {isLoading
                            ? t("auth.verifying")
                            : t("auth.verifyEmail")}
                    </Button>

                    <Button
                        type="button"
                        variant="ghost"
                        size="full"
                        className="text-ink/40 hover:text-ink"
                        onClick={closeModal}
                    >
                        {t("auth.skipForNow")}
                    </Button>
                </div>

                <button
                    type="button"
                    disabled={isResending}
                    onClick={() => void handleResend()}
                    className="text-blue-500 text-sm hover:underline disabled:opacity-50"
                >
                    {isResending ? t("auth.resending") : t("auth.resendCode")}
                </button>
            </form>
        </div>
    );
}
