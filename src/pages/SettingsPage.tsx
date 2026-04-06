import { useEffect, useState } from "react";
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
import { authApi } from "../features/auth/api/auth-api";
import { getErrorMessage } from "../shared/utils/error-handler";
import type { AccountInfo } from "../features/settings/api/settings.types";

export default function SettingsPage() {
    const { isAuthenticated } = useAuthStore();
    const navigate = useNavigate();
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
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 py-4">
                <h1 className="text-xl font-bold text-white">Settings</h1>
                <p className="text-sm text-white/40 mt-1">
                    Manage your account
                </p>
            </div>

            <div className="divide-y divide-white/10">
                <AccountInfoSection
                    accountInfo={accountInfo}
                    isLoading={infoLoading}
                    error={infoError}
                />
                {accountInfo && !accountInfo.isEmailVerified && (
                    <VerifyEmailSection onVerified={refetchAccountInfo} />
                )}
                <ChangeUsernameSection />
                <ChangeEmailSection />
                <ChangePasswordSection
                    providers={accountInfo?.providers ?? null}
                />
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
            <h2 className="text-base font-bold text-white mb-4">{title}</h2>
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

function AccountInfoSection({
    accountInfo,
    isLoading,
    error,
}: {
    accountInfo: AccountInfo | null;
    isLoading: boolean;
    error: string | null;
}) {
    return (
        <SectionCard title="Account Info">
            {isLoading && (
                <p className="text-sm text-white/40">Loading account info…</p>
            )}
            {error && <p className="text-sm text-red-400">{error}</p>}
            {accountInfo && (
                <div className="space-y-3">
                    <InfoRow
                        label="Username"
                        value={`@${accountInfo.username}`}
                    />
                    <InfoRow label="Email" value={accountInfo.email} />
                    <InfoRow
                        label="Email Verified"
                        value={accountInfo.isEmailVerified ? "Yes" : "No"}
                    />
                    <InfoRow
                        label="Sign-in Methods"
                        value={accountInfo.providers.join(", ") || "—"}
                    />
                    <InfoRow
                        label="Member Since"
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
            <span className="text-sm text-white/50 shrink-0">{label}</span>
            <span className="text-sm text-white text-right truncate">
                {value}
            </span>
        </div>
    );
}

function ChangeUsernameSection() {
    const { handleSubmit, isLoading, error, success } = useUpdateUsername();
    const [newUsername, setNewUsername] = useState("");

    async function handleFormSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!newUsername.trim()) return;
        await handleSubmit(newUsername.trim());
        if (!error) setNewUsername("");
    }

    return (
        <SectionCard title="Change Username">
            <form
                onSubmit={(e) => void handleFormSubmit(e)}
                className="space-y-3"
            >
                <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="New username"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 text-sm"
                />
                <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={isLoading || !newUsername.trim()}
                >
                    {isLoading ? "Saving…" : "Update Username"}
                </Button>
                <StatusMessage
                    error={error}
                    success={success}
                    successText="Username updated successfully."
                />
            </form>
        </SectionCard>
    );
}

function ChangeEmailSection() {
    const { handleSubmit, isLoading, error, success } = useUpdateEmail();
    const [newEmail, setNewEmail] = useState("");

    async function handleFormSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!newEmail.trim()) return;
        await handleSubmit(newEmail.trim());
        if (!error) setNewEmail("");
    }

    return (
        <SectionCard title="Change Email">
            <form
                onSubmit={(e) => void handleFormSubmit(e)}
                className="space-y-3"
            >
                <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="New email address"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 text-sm"
                />
                <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={isLoading || !newEmail.trim()}
                >
                    {isLoading ? "Saving…" : "Update Email"}
                </Button>
                <StatusMessage
                    error={error}
                    success={success}
                    successText="Email updated. Check your inbox to verify your new address."
                />
            </form>
        </SectionCard>
    );
}

function ChangePasswordSection({ providers }: { providers: string[] | null }) {
    const { handleSubmit, isLoading, error, success } = useUpdatePassword();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [localError, setLocalError] = useState<string | null>(null);

    if (providers !== null && !providers.includes("local")) return null;

    async function handleFormSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLocalError(null);
        if (newPassword !== confirmPassword) {
            setLocalError("Passwords do not match.");
            return;
        }
        if (newPassword.length < 8) {
            setLocalError("Password must be at least 8 characters.");
            return;
        }
        await handleSubmit(currentPassword, newPassword);
        if (!error) {
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        }
    }

    return (
        <SectionCard title="Change Password">
            <form
                onSubmit={(e) => void handleFormSubmit(e)}
                className="space-y-3"
            >
                <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Current password"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 text-sm"
                />
                <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password (min 8 characters)"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 text-sm"
                />
                <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 text-sm"
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
                    {isLoading ? "Saving…" : "Update Password"}
                </Button>
                <StatusMessage
                    error={localError ?? error}
                    success={success}
                    successText="Password updated successfully."
                />
            </form>
        </SectionCard>
    );
}

function VerifyEmailSection({ onVerified }: { onVerified: () => void }) {
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
        <SectionCard title="Verify Email">
            <p className="text-sm text-white/50 mb-4">
                Your email address is not verified. Verify it to secure your
                account.
            </p>

            {step === "idle" ? (
                <div className="space-y-3">
                    <Button
                        variant="primary"
                        size="md"
                        onClick={() => void handleSendCode()}
                        disabled={isSending}
                    >
                        {isSending ? "Sending…" : "Send Verification Code"}
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
                            Code sent! Check your inbox.
                        </p>
                    )}
                    <input
                        type="text"
                        maxLength={8}
                        value={code}
                        onChange={(e) =>
                            setCode(e.target.value.replace(/[^0-9]/g, ""))
                        }
                        placeholder="8-digit code"
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 text-sm font-mono tracking-widest text-center"
                        autoFocus
                    />
                    <div className="flex gap-2">
                        <Button
                            type="submit"
                            variant="primary"
                            size="md"
                            disabled={isVerifying || code.length !== 8}
                        >
                            {isVerifying ? "Verifying…" : "Verify"}
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            size="md"
                            onClick={() => void handleSendCode()}
                            disabled={isSending}
                        >
                            {isSending ? "Sending…" : "Resend"}
                        </Button>
                    </div>
                    {error && <p className="text-sm text-red-400">{error}</p>}
                </form>
            )}
        </SectionCard>
    );
}

function DangerZoneSection() {
    const { isAuthenticated, logout } = useAuthStore();
    const navigate = useNavigate();
    const { handleDelete, isLoading, error } = useDeleteAccount();
    const [showConfirm, setShowConfirm] = useState(false);

    async function handleLogout() {
        await logout();
        navigate("/");
    }

    return (
        <SectionCard title="Danger Zone">
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-white">
                            Log out
                        </p>
                        <p className="text-xs text-white/40 mt-0.5">
                            Sign out of your account on this device.
                        </p>
                    </div>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void handleLogout()}
                        disabled={!isAuthenticated}
                    >
                        Log out
                    </Button>
                </div>

                <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-red-400">
                            Delete Account
                        </p>
                        <p className="text-xs text-white/40 mt-0.5">
                            Your account will be deactivated. You have 30 days
                            to recover it before permanent deletion.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowConfirm(true)}
                        className="shrink-0 ml-4 px-3 py-1.5 text-sm font-semibold text-red-400 border border-red-400/30 rounded-lg hover:bg-red-400/10 transition-colors"
                    >
                        Delete
                    </button>
                </div>
                {error && <p className="text-sm text-red-400">{error}</p>}
            </div>

            <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)}>
                <div className="p-6">
                    <h3 className="text-lg font-bold text-white mb-2">
                        Delete your account?
                    </h3>
                    <p className="text-sm text-white/60 mb-6">
                        Your account will be deactivated immediately. You have{" "}
                        <span className="text-white font-medium">30 days</span>{" "}
                        to log back in and recover it before it is permanently
                        deleted.
                    </p>
                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            size="md"
                            onClick={() => setShowConfirm(false)}
                        >
                            Cancel
                        </Button>
                        <button
                            onClick={() => void handleDelete()}
                            disabled={isLoading}
                            className="flex-1 py-2.5 px-4 rounded-full text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                            {isLoading ? "Deleting…" : "Yes, delete my account"}
                        </button>
                    </div>
                </div>
            </Modal>
        </SectionCard>
    );
}
