import { useState } from "react";
import { useAuthModalStore } from "../../store/auth-modal.store";
import { authApi } from "../../api/auth-api";
import { useAuthStore } from "../../../../core/auth/auth.store";
import { Button } from "../../../../shared/components/ui/Button";
import { profileApi } from "../../../profile/api/profile.api";
import { getErrorMessage } from "../../../../shared/utils/error-handler";
import { useI18n } from "../../../../shared/hooks/useI18n";
import type { ApiErrorResponse } from "../../../../core/api/api-types";

const FIELDS = ["email", "username", "password"] as const;
type Field = (typeof FIELDS)[number];

/**
 * Picks out the field the API rejected. Validation entries name it in
 * `instancePath` ("/username") and never in the message — "must NOT have fewer
 * than 3 characters" reads the same whichever field it came from, and the
 * conflict on an existing account ("A user with these details already
 * exists.") names no field at all.
 */
function fieldFromError(err: unknown): Field | null {
    if (!err || typeof err !== "object" || !("validation" in err)) return null;
    const path = (err as ApiErrorResponse).validation?.[0]?.instancePath ?? "";
    return FIELDS.find((field) => path === `/${field}`) ?? null;
}

export function RegisterView() {
    const { t } = useI18n();
    const { identifier, setStep, setIdentifier, closeModal } =
        useAuthModalStore();
    const { setAuth, updateUser } = useAuthStore();

    const isEmailInput = identifier.includes("@");

    // Form State
    const [formData, setFormData] = useState({
        email: isEmailInput ? identifier : "",
        username: isEmailInput ? "" : identifier,
        password: "",
    });

    // UI States
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errorField, setErrorField] = useState<Field | null>(null);

    // Input Değişim Takibi
    const handleChange = (field: keyof typeof formData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        // Kullanıcı düzeltme yapmaya başlayınca hatayı gizle
        if (error) {
            setError(null);
            setErrorField(null);
        }
    };

    const handleRegister = async () => {
        setError(null);
        setErrorField(null);
        setIsLoading(true);

        const payload = {
            email: formData.email.trim(),
            username: formData.username.trim(),
            password: formData.password,
        };

        // 1. ADIM: Kayıt Ol
        try {
            await authApi.register(payload);
        } catch (err: unknown) {
            setError(getErrorMessage(err));
            setErrorField(fieldFromError(err));
            setIsLoading(false);
            return;
        }

        // 2. ADIM: Otomatik Giriş Yap. Hesap artık var, dolayısıyla buradan
        // sonraki bir hata kullanıcıyı bu forma geri bırakamaz — tekrar
        // gönderilmesi kesin olarak 409 döner. Şifresi elimizde olduğu için
        // giriş adımına devrediyoruz.
        try {
            const data = await authApi.login(
                payload.username,
                payload.password,
            );
            const { accessToken, user } = data;

            setAuth(user, accessToken);

            try {
                const profileData = await profileApi.getProfile(user.username);
                updateUser({
                    fullName: profileData.fullName,
                    avatarUrl: profileData.avatarUrl,
                });
            } catch (profileError) {
                console.error(
                    "Profile sync failed after register:",
                    profileError,
                );
            }

            if (!user.isEmailVerified) {
                setStep("verify-email");
            } else {
                closeModal();
            }
        } catch (err: unknown) {
            console.error("Auto-login after register failed:", err);
            setIdentifier(payload.username);
            setStep("login");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl md:text-3xl font-bold mb-2 text-white tracking-tight">
                {t("auth.registerTitle")}
            </h2>
            <p className="text-white/40 mb-6 text-sm">
                {t("auth.registerSubtitle")}
            </p>

            <div className="space-y-4">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm py-3 px-4 rounded-md animate-in shake-in duration-300">
                        {error}
                    </div>
                )}

                <div className="flex flex-col gap-1">
                    <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        placeholder={t("auth.emailPlaceholder")}
                        className={`w-full bg-black border ${
                            errorField === "email"
                                ? "border-red-500"
                                : "border-white/20"
                        } rounded-md p-4 text-white focus:border-blue-500 outline-none transition-all placeholder:text-white/20`}
                    />
                </div>

                {/* Username Field */}
                <div className="flex flex-col gap-1">
                    <input
                        type="text"
                        value={formData.username}
                        onChange={(e) =>
                            handleChange("username", e.target.value)
                        }
                        placeholder={t("auth.usernamePlaceholder")}
                        className={`w-full bg-black border ${
                            errorField === "username"
                                ? "border-red-500"
                                : "border-white/20"
                        } rounded-md p-4 text-white focus:border-blue-500 outline-none transition-all placeholder:text-white/20`}
                    />
                </div>

                {/* Password Field */}
                <div className="flex flex-col gap-1">
                    <input
                        type="password"
                        value={formData.password}
                        onChange={(e) =>
                            handleChange("password", e.target.value)
                        }
                        placeholder={t("auth.passwordPlaceholder")}
                        className={`w-full bg-black border ${
                            errorField === "password"
                                ? "border-red-500"
                                : "border-white/20"
                        } rounded-md p-4 text-white focus:border-blue-500 outline-none transition-all placeholder:text-white/20`}
                    />
                </div>

                <Button
                    variant="primary"
                    size="full"
                    className="mt-4 py-3"
                    onClick={handleRegister}
                    disabled={
                        isLoading ||
                        !formData.email.trim() ||
                        !formData.username.trim() ||
                        !formData.password
                    }
                >
                    {isLoading ? t("auth.creatingAccount") : t("auth.register")}
                </Button>

                <Button
                    variant="ghost"
                    size="full"
                    className="text-white/40 hover:text-white py-2"
                    onClick={() => setStep("identifier")}
                >
                    {t("auth.back")}
                </Button>
            </div>
        </div>
    );
}
