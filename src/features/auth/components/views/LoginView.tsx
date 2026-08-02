import { useState } from "react";
import { useAuthModalStore } from "../../store/auth-modal.store";
import { authApi } from "../../api/auth-api";
import { useAuthStore } from "../../../../core/auth/auth.store";
import { Button } from "../../../../shared/components/ui/Button";
import { profileApi } from "../../../profile/api/profile.api";
import { getErrorMessage } from "../../../../shared/utils/error-handler";
import { useI18n } from "../../../../shared/hooks/useI18n";

export function LoginView() {
    const { t } = useI18n();
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { identifier, setStep, closeModal, setRecoveryToken } =
        useAuthModalStore();
    const { setAuth, updateUser } = useAuthStore();

    const handlePasswordChange = (val: string) => {
        setPassword(val);
        if (error) setError(null);
    };

    // An identifier can be a username or an email; only the former is a handle.
    const displayIdentifier = identifier.includes("@")
        ? identifier
        : `@${identifier}`;

    const handleLogin = async () => {
        setError(null);
        setIsLoading(true);
        try {
            const data = await authApi.login(identifier, password);

            setAuth(data.user, data.accessToken);

            try {
                const profileResponse = await profileApi.getProfile(
                    data.user.username,
                );
                updateUser({
                    fullName: profileResponse.fullName,
                    avatarUrl: profileResponse.avatarUrl,
                });
            } catch (profileErr) {
                console.error(
                    "Profile sync failed, continuing with basic data:",
                    profileErr,
                );
            }

            if (!data.user.isEmailVerified) {
                setStep("verify-email");
            } else {
                closeModal();
            }
        } catch (err: unknown) {
            const apiError = err as { status?: number; recoveryToken?: string };

            if (apiError?.status === 403 && apiError?.recoveryToken) {
                setRecoveryToken(apiError.recoveryToken);
                setStep("account-recovery");
                return;
            }

            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl md:text-3xl font-bold mb-2 text-white tracking-tight text-center">
                {t("auth.passwordTitle")}
            </h2>
            <p className="text-white/40 text-center mb-8">
                {t("auth.loggingInAs")}{" "}
                <span className="text-white/80 font-medium">
                    {displayIdentifier}
                </span>
            </p>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    void handleLogin();
                }}
                className="space-y-4"
            >
                {/* Hata Mesajı Kutusu */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm py-3 px-4 rounded-md animate-in shake-in duration-300">
                        {error}
                    </div>
                )}

                <div className="relative">
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        placeholder={t("auth.passwordPlaceholder")}
                        className={`w-full bg-black border ${
                            error ? "border-red-500" : "border-white/20"
                        } rounded-md p-4 text-white focus:border-blue-500 outline-none transition-all placeholder:text-white/20`}
                        autoComplete="current-password"
                        autoFocus
                    />
                </div>

                <div className="flex justify-between items-center px-1">
                    <p
                        className="text-blue-500 text-sm cursor-pointer hover:underline transition-all"
                        onClick={() => setStep("forgot-password")}
                    >
                        {t("auth.forgotPassword")}
                    </p>
                </div>

                {/* `Button` sets no default type, so inside a form every one of
                    them submits unless it says otherwise. */}
                <Button
                    type="submit"
                    variant="primary"
                    size="full"
                    className="mt-4 py-3"
                    disabled={isLoading || !password}
                >
                    {isLoading ? t("auth.loggingIn") : t("auth.login")}
                </Button>

                <Button
                    type="button"
                    variant="ghost"
                    size="full"
                    className="text-white/40 hover:text-white py-2"
                    onClick={() => setStep("identifier")}
                >
                    {t("auth.changeAccount")}
                </Button>
            </form>
        </div>
    );
}
