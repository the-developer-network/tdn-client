import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageShell } from "../shared/layout/PageShell";
import { TrendingTopicsWidget } from "../shared/components/TrendingTopicsWidget";
import { Button } from "../shared/components/ui/Button";
import { Modal } from "../shared/components/ui/Modal";
import { useAuthStore } from "../core/auth/auth.store";
import { useAccountInfo } from "../features/settings/hooks/useAccountInfo";
import { useUpdateUsername } from "../features/settings/hooks/useUpdateUsername";
import { useUpdateEmail } from "../features/settings/hooks/useUpdateEmail";
import { useUpdatePassword } from "../features/settings/hooks/useUpdatePassword";
import { useDeleteAccount } from "../features/settings/hooks/useDeleteAccount";
import { BlockedAccountsList } from "../features/block/components/BlockedAccountsList";
import { authApi } from "../features/auth/api/auth-api";
import { getErrorMessage } from "../shared/utils/error-handler";
import { useLanguageStore } from "../shared/store/language.store";
import { useTheme } from "../shared/hooks/useTheme";
import { useI18n } from "../shared/hooks/useI18n";
import type { AccountInfo } from "../features/settings/api/settings.types";
import type { Locale } from "../shared/store/language.store";
import type { Theme } from "../shared/store/theme.store";

export default function SettingsPage() {
    const { isAuthenticated } = useAuthStore();
    const navigate = useNavigate();
    const { t } = useI18n();
    const {
        accountInfo,
        isLoading: infoLoading,
        error: infoError,
        refetch: refetchAccountInfo,
    } = useAccountInfo();

    useEffect(() => {
        if (!isAuthenticated) {
            navigate("/", { replace: true });
        }
    }, [isAuthenticated, navigate]);

    if (!isAuthenticated) return null;

    return (
        <PageShell rightRail={<TrendingTopicsWidget />}>
            <div className="sticky top-0 z-10 bg-ground/80 backdrop-blur-md border-b border-ink/10 px-4 py-4">
                <h1 className="text-xl font-bold text-ink">
                    {t("settings.title")}
                </h1>
                <p className="text-sm text-ink/40 mt-1">
                    {t("settings.subtitle")}
                </p>
            </div>

            <div className="divide-y divide-ink/10">
                <AccountInfoSection
                    accountInfo={accountInfo}
                    isLoading={infoLoading}
                    error={infoError}
                />
                {accountInfo && !accountInfo.isEmailVerified && (
                    <VerifyEmailSection onVerified={refetchAccountInfo} />
                )}
                <LanguageSection />
                <ThemeSection />
                <BlockedAccountsSection />
                <ChangeUsernameSection />
                <ChangeEmailSection />
                <ChangePasswordSection />
                <DangerZoneSection />
            </div>
        </PageShell>
    );
}

function SectionCard({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="px-4 py-6">
            <h2 className="text-base font-bold text-ink mb-4">{title}</h2>
            {children}
        </div>
    );
}

function StatusMessage({
    error,
    success,
    successText,
}: {
    error: string | null;
    success: boolean;
    successText: string;
}) {
    if (error) return <p className="text-sm text-red-400 mt-2">{error}</p>;
    if (success)
        return <p className="text-sm text-green-400 mt-2">{successText}</p>;
    return null;
}
function LanguageSection() {
    const { t } = useI18n();
    const { locale, setLocale } = useLanguageStore();

    const options: { value: Locale; label: string }[] = [
        { value: "en", label: t("settings.english") },
        { value: "tr", label: t("settings.turkish") },
    ];

    return (
        <SectionCard title={t("settings.language")}>
            <p className="text-sm text-ink/50 mb-4">
                {t("settings.languageSubtitle")}
            </p>
            <div className="flex gap-3">
                {options.map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => setLocale(opt.value)}
                        className={`px-5 py-2 rounded-full text-sm font-semibold border transition-colors ${
                            locale === opt.value
                                ? "bg-ink text-ground border-ink"
                                : "bg-transparent text-ink/60 border-ink/20 hover:border-ink/40 hover:text-ink"
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </SectionCard>
    );
}

function ThemeSection() {
    const { t } = useI18n();
    const { theme, setTheme } = useTheme();

    const options: { value: Theme; label: string; Icon: typeof Sun }[] = [
        { value: "dark", label: t("settings.themeDark"), Icon: Moon },
        { value: "light", label: t("settings.themeLight"), Icon: Sun },
        { value: "system", label: t("settings.themeSystem"), Icon: Monitor },
    ];

    return (
        <SectionCard title={t("settings.theme")}>
            <p className="text-sm text-ink/50 mb-4">
                {t("settings.themeSubtitle")}
            </p>
            <div className="flex flex-wrap gap-3">
                {options.map(({ value, label, Icon }) => (
                    <button
                        key={value}
                        onClick={() => setTheme(value)}
                        aria-pressed={theme === value}
                        className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold border transition-colors ${
                            theme === value
                                ? "bg-ink text-ground border-ink"
                                : "bg-transparent text-ink/60 border-ink/20 hover:border-ink/40 hover:text-ink"
                        }`}
                    >
                        <Icon size={15} aria-hidden="true" />
                        {label}
                    </button>
                ))}
            </div>
        </SectionCard>
    );
}

function BlockedAccountsSection() {
    const { t } = useI18n();

    return (
        <SectionCard title={t("block.blockedAccounts")}>
            <p className="text-sm text-ink/50 mb-4">
                {t("block.blockedAccountsSubtitle")}
            </p>
            <BlockedAccountsList />
        </SectionCard>
    );
}

function AccountInfoSection({
    accountInfo,
    isLoading,
    error,
}: {
    accountInfo: AccountInfo | null;
    isLoading: boolean;
    error: string | null;
}) {
    const { t } = useI18n();

    return (
        <SectionCard title={t("settings.accountInfo")}>
            {isLoading && (
                <p className="text-sm text-ink/40">
                    {t("settings.accountInfoLoading")}
                </p>
            )}
            {error && <p className="text-sm text-red-400">{error}</p>}
            {accountInfo && (
                <div className="space-y-3">
                    <InfoRow
                        label={t("settings.username")}
                        value={`@${accountInfo.username}`}
                    />
                    <InfoRow
                        label={t("settings.email")}
                        value={accountInfo.email}
                    />
                    <InfoRow
                        label={t("settings.emailVerified")}
                        value={
                            accountInfo.isEmailVerified
                                ? t("settings.yes")
                                : t("settings.no")
                        }
                    />
                    <InfoRow
                        label={t("settings.signInMethods")}
                        value={accountInfo.providers.join(", ") || "—"}
                    />
                    <InfoRow
                        label={t("settings.memberSince")}
                        value={new Date(
                            accountInfo.createdAt,
                        ).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                        })}
                    />
                </div>
            )}
        </SectionCard>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-ink/50 shrink-0">{label}</span>
            <span className="text-sm text-ink text-right truncate">
                {value}
            </span>
        </div>
    );
}

function ChangeUsernameSection() {
    const { t } = useI18n();
    const { handleSubmit, isLoading, error, success } = useUpdateUsername();
    const [newUsername, setNewUsername] = useState("");

    async function handleFormSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!newUsername.trim()) return;
        const updated = await handleSubmit(newUsername.trim());
        if (updated) setNewUsername("");
    }

    return (
        <SectionCard title={t("settings.changeUsername")}>
            <form
                onSubmit={(e) => void handleFormSubmit(e)}
                className="space-y-3"
            >
                <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder={t("settings.newUsernamePlaceholder")}
                    className="w-full bg-surface-1 border border-ink/10 rounded-xl px-4 py-3 text-ink placeholder:text-ink/30 focus:outline-none focus:border-ink/30 text-sm"
                />
                <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={isLoading || !newUsername.trim()}
                >
                    {isLoading
                        ? t("settings.saving")
                        : t("settings.updateUsername")}
                </Button>
                <StatusMessage
                    error={error}
                    success={success}
                    successText={t("settings.usernameSuccess")}
                />
            </form>
        </SectionCard>
    );
}

function ChangeEmailSection() {
    const { t } = useI18n();
    const { handleSubmit, isLoading, error, success } = useUpdateEmail();
    const [newEmail, setNewEmail] = useState("");

    async function handleFormSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!newEmail.trim()) return;
        const updated = await handleSubmit(newEmail.trim());
        if (updated) setNewEmail("");
    }

    return (
        <SectionCard title={t("settings.changeEmail")}>
            <form
                onSubmit={(e) => void handleFormSubmit(e)}
                className="space-y-3"
            >
                <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder={t("settings.newEmailPlaceholder")}
                    className="w-full bg-surface-1 border border-ink/10 rounded-xl px-4 py-3 text-ink placeholder:text-ink/30 focus:outline-none focus:border-ink/30 text-sm"
                />
                <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={isLoading || !newEmail.trim()}
                >
                    {isLoading
                        ? t("settings.saving")
                        : t("settings.updateEmail")}
                </Button>
                <StatusMessage
                    error={error}
                    success={success}
                    successText={t("settings.emailSuccess")}
                />
            </form>
        </SectionCard>
    );
}

function ChangePasswordSection() {
    const { t } = useI18n();
    const { handleSubmit, isLoading, error, success } = useUpdatePassword();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [localError, setLocalError] = useState<string | null>(null);

    async function handleFormSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLocalError(null);
        if (newPassword !== confirmPassword) {
            setLocalError(t("settings.passwordMismatch"));
            return;
        }
        if (newPassword.length < 8) {
            setLocalError(t("settings.passwordTooShort"));
            return;
        }
        const updated = await handleSubmit(currentPassword, newPassword);
        if (updated) {
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        }
    }

    return (
        <SectionCard title={t("settings.changePassword")}>
            <form
                onSubmit={(e) => void handleFormSubmit(e)}
                className="space-y-3"
            >
                <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder={t("settings.currentPasswordPlaceholder")}
                    className="w-full bg-surface-1 border border-ink/10 rounded-xl px-4 py-3 text-ink placeholder:text-ink/30 focus:outline-none focus:border-ink/30 text-sm"
                />
                <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t("settings.newPasswordPlaceholder")}
                    className="w-full bg-surface-1 border border-ink/10 rounded-xl px-4 py-3 text-ink placeholder:text-ink/30 focus:outline-none focus:border-ink/30 text-sm"
                />
                <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t("settings.confirmPasswordPlaceholder")}
                    className="w-full bg-surface-1 border border-ink/10 rounded-xl px-4 py-3 text-ink placeholder:text-ink/30 focus:outline-none focus:border-ink/30 text-sm"
                />
                <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={
                        isLoading ||
                        !currentPassword ||
                        !newPassword ||
                        !confirmPassword
                    }
                >
                    {isLoading
                        ? t("settings.saving")
                        : t("settings.updatePassword")}
                </Button>
                <StatusMessage
                    error={localError ?? error}
                    success={success}
                    successText={t("settings.passwordSuccess")}
                />
            </form>
        </SectionCard>
    );
}

function VerifyEmailSection({ onVerified }: { onVerified: () => void }) {
    const { t } = useI18n();
    const { updateUser } = useAuthStore();
    const [step, setStep] = useState<"idle" | "sent">("idle");
    const [code, setCode] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sendSuccess, setSendSuccess] = useState(false);

    async function handleSendCode() {
        setIsSending(true);
        setError(null);
        setSendSuccess(false);
        try {
            await authApi.sendVerification();
            setStep("sent");
            setSendSuccess(true);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsSending(false);
        }
    }

    async function handleVerify(e: React.FormEvent) {
        e.preventDefault();
        if (code.length !== 8) return;
        setIsVerifying(true);
        setError(null);
        try {
            const data = await authApi.verifyEmail(code);
            if (data.verified) {
                updateUser({ isEmailVerified: true });
                onVerified();
            }
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsVerifying(false);
        }
    }

    return (
        <SectionCard title={t("settings.verifyEmail")}>
            <p className="text-sm text-ink/50 mb-4">
                {t("settings.verifyEmailBody")}
            </p>

            {step === "idle" ? (
                <div className="space-y-3">
                    <Button
                        variant="primary"
                        size="md"
                        onClick={() => void handleSendCode()}
                        disabled={isSending}
                    >
                        {isSending
                            ? t("settings.sendingCode")
                            : t("settings.sendVerification")}
                    </Button>
                    {error && <p className="text-sm text-red-400">{error}</p>}
                </div>
            ) : (
                <form
                    onSubmit={(e) => void handleVerify(e)}
                    className="space-y-3"
                >
                    {sendSuccess && (
                        <p className="text-sm text-green-400">
                            {t("settings.codeSent")}
                        </p>
                    )}
                    <input
                        type="text"
                        maxLength={8}
                        value={code}
                        onChange={(e) =>
                            setCode(e.target.value.replace(/[^0-9]/g, ""))
                        }
                        placeholder={t("settings.codeInputPlaceholder")}
                        className="w-full bg-surface-1 border border-ink/10 rounded-xl px-4 py-3 text-ink placeholder:text-ink/30 focus:outline-none focus:border-ink/30 text-sm font-mono tracking-widest text-center"
                        autoFocus
                    />
                    <div className="flex gap-2">
                        <Button
                            type="submit"
                            variant="primary"
                            size="md"
                            disabled={isVerifying || code.length !== 8}
                        >
                            {isVerifying
                                ? t("settings.verifying")
                                : t("settings.verify")}
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            size="md"
                            onClick={() => void handleSendCode()}
                            disabled={isSending}
                        >
                            {isSending
                                ? t("settings.sendingCode")
                                : t("settings.resend")}
                        </Button>
                    </div>
                    {error && <p className="text-sm text-red-400">{error}</p>}
                </form>
            )}
        </SectionCard>
    );
}

function DangerZoneSection() {
    const { t } = useI18n();
    const { isAuthenticated, logout } = useAuthStore();
    const navigate = useNavigate();
    const { handleDelete, isLoading, error } = useDeleteAccount();
    const [showConfirm, setShowConfirm] = useState(false);
    const [password, setPassword] = useState("");
    const [localError, setLocalError] = useState<string | null>(null);

    async function handleLogout() {
        await logout();
        navigate("/");
    }

    function closeConfirm() {
        setShowConfirm(false);
        setPassword("");
        setLocalError(null);
    }

    async function handleConfirmDelete() {
        if (!password) {
            setLocalError(t("settings.deleteAccountPasswordRequired"));
            return;
        }
        setLocalError(null);
        await handleDelete(password);
    }

    return (
        <SectionCard title={t("settings.dangerZone")}>
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-ink">
                            {t("settings.logOut")}
                        </p>
                        <p className="text-xs text-ink/40 mt-0.5">
                            {t("settings.logOutSubtitle")}
                        </p>
                    </div>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void handleLogout()}
                        disabled={!isAuthenticated}
                    >
                        {t("settings.logOut")}
                    </Button>
                </div>

                <div className="border-t border-ink/10 pt-3 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-red-400">
                            {t("settings.deleteAccount")}
                        </p>
                        <p className="text-xs text-ink/40 mt-0.5">
                            {t("settings.deleteAccountSubtitle")}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowConfirm(true)}
                        className="shrink-0 ml-4 px-3 py-1.5 text-sm font-semibold text-red-400 border border-red-400/30 rounded-lg hover:bg-red-400/10 transition-colors"
                    >
                        {t("settings.delete")}
                    </button>
                </div>
            </div>

            <Modal isOpen={showConfirm} onClose={closeConfirm}>
                <div className="p-6">
                    <h3 className="text-lg font-bold text-ink mb-2">
                        {t("settings.deleteAccountTitle")}
                    </h3>
                    <p className="text-sm text-ink/60 mb-4">
                        {t("settings.deleteAccountBody")}
                    </p>
                    <label
                        htmlFor="delete-account-password"
                        className="block text-sm text-ink/60 mb-2"
                    >
                        {t("settings.deleteAccountPasswordLabel")}
                    </label>
                    <input
                        id="delete-account-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t(
                            "settings.deleteAccountPasswordPlaceholder",
                        )}
                        className="w-full bg-surface-1 border border-ink/10 rounded-xl px-4 py-3 text-ink placeholder:text-ink/30 focus:outline-none focus:border-ink/30 text-sm mb-2"
                    />
                    {(localError ?? error) && (
                        <p className="text-sm text-red-400 mb-2">
                            {localError ?? error}
                        </p>
                    )}
                    <div className="flex gap-3 mt-4">
                        <Button
                            variant="secondary"
                            size="md"
                            onClick={closeConfirm}
                        >
                            {t("settings.cancel")}
                        </Button>
                        <button
                            onClick={() => void handleConfirmDelete()}
                            disabled={isLoading}
                            className="flex-1 py-2.5 px-4 rounded-full text-sm font-bold text-on-fill bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                            {isLoading
                                ? t("settings.deleting")
                                : t("settings.deleteAccountConfirm")}
                        </button>
                    </div>
                </div>
            </Modal>
        </SectionCard>
    );
}
