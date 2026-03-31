import { useState } from "react";
import { useAuthModalStore } from "../../store/auth-modal.store";
import { authApi } from "../../api/auth-api";
import { useAuthStore } from "../../../../core/auth/auth.store";
import { Button } from "../../../../shared/components/ui/Button";
import { profileApi } from "../../../profile/api/profile.api";
import { getErrorMessage } from "../../../../shared/utils/error-handler";

export function RegisterView() {
    const { identifier, setStep, closeModal } = useAuthModalStore();
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

    // Input Değişim Takibi
    const handleChange = (field: keyof typeof formData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (error) setError(null); // Kullanıcı düzeltme yapmaya başlayınca hatayı gizle
    };

    const handleRegister = async () => {
        setError(null);
        setIsLoading(true);

        const payload = {
            email: formData.email.trim(),
            username: formData.username.trim(),
            password: formData.password,
        };

        try {
            // 1. ADIM: Kayıt Ol
            await authApi.register(payload);

            // 2. ADIM: Otomatik Giriş Yap
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
            const message = getErrorMessage(err);
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl md:text-3xl font-bold mb-2 text-white tracking-tight">
                Create your account
            </h2>
            <p className="text-white/40 mb-6 text-sm">
                Join the developer network today.
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
                        placeholder="Email"
                        className={`w-full bg-black border ${
                            error && error.includes("email")
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
                        placeholder="Username"
                        className={`w-full bg-black border ${
                            error && error.includes("username")
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
                        placeholder="Password"
                        className={`w-full bg-black border ${
                            error && error.includes("password")
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
                        !formData.email ||
                        !formData.username ||
                        !formData.password
                    }
                >
                    {isLoading ? "Creating account..." : "Register"}
                </Button>

                <Button
                    variant="ghost"
                    size="full"
                    className="text-white/40 hover:text-white py-2"
                    onClick={() => setStep("identifier")}
                >
                    Back
                </Button>
            </div>
        </div>
    );
}
