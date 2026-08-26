import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "../shared/components/ui/Button";
import { InterestPicker } from "../features/onboarding/components/InterestPicker";
import { AccountCard } from "../features/onboarding/components/AccountCard";
import { useOnboardingSuggestions } from "../features/onboarding/hooks/useOnboardingSuggestions";
import { useOnboardingFollows } from "../features/onboarding/hooks/useOnboardingFollows";
import { useOnboardingStore } from "../features/onboarding/store/onboarding.store";
import { MIN_FOLLOWS } from "../features/onboarding/onboarding.types";
import { useAuthStore } from "../core/auth/auth.store";
import { useI18n } from "../shared/hooks/useI18n";
import type { PostCategory } from "../features/feed/api/feed.types";

type Step = "fields" | "accounts";

export default function OnboardingPage() {
    const { t } = useI18n();
    const navigate = useNavigate();

    const user = useAuthStore((state) => state.user);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const complete = useOnboardingStore((state) => state.complete);

    const [step, setStep] = useState<Step>("fields");
    const [selected, setSelected] = useState<PostCategory[]>([]);

    if (!isAuthenticated) return <Navigate to="/" replace />;

    return (
        <div className="min-h-screen bg-black text-white">
            <div className="mx-auto flex min-h-screen w-full max-w-[600px] flex-col px-4 py-8">
                <p className="text-xs font-medium uppercase tracking-wide text-white/30">
                    {t("onboarding.stepOfTwo", {
                        n: step === "fields" ? 1 : 2,
                    })}
                </p>

                {step === "fields" ? (
                    <FieldsStep
                        selected={selected}
                        onChange={setSelected}
                        onContinue={() => setStep("accounts")}
                    />
                ) : (
                    <AccountsStep
                        categories={selected}
                        onBack={() => setStep("fields")}
                        onFinish={() => {
                            if (user) complete(user.id, selected);
                            navigate("/", { replace: true });
                        }}
                    />
                )}
            </div>
        </div>
    );
}

interface FieldsStepProps {
    selected: PostCategory[];
    onChange: (next: PostCategory[]) => void;
    onContinue: () => void;
}

function FieldsStep({ selected, onChange, onContinue }: FieldsStepProps) {
    const { t } = useI18n();

    function toggle(category: PostCategory) {
        onChange(
            selected.includes(category)
                ? selected.filter((c) => c !== category)
                : [...selected, category],
        );
    }

    return (
        <>
            <h1 className="mt-2 text-2xl font-bold">
                {t("onboarding.fieldsTitle")}
            </h1>
            <p className="mt-2 text-[15px] text-white/50">
                {t("onboarding.fieldsBody")}
            </p>

            <div className="mt-8">
                <InterestPicker selected={selected} onToggle={toggle} />
            </div>

            <div className="mt-auto pt-8">
                <Button
                    size="full"
                    disabled={selected.length === 0}
                    onClick={onContinue}
                >
                    {t("onboarding.continue")}
                </Button>
            </div>
        </>
    );
}

interface AccountsStepProps {
    categories: PostCategory[];
    onBack: () => void;
    onFinish: () => void;
}

function AccountsStep({ categories, onBack, onFinish }: AccountsStepProps) {
    const { t } = useI18n();
    const { accounts, isLoading, error, retry } =
        useOnboardingSuggestions(categories);
    const { followedIds, followedCount, isPending, toggle } =
        useOnboardingFollows();

    // A brand-new deployment may not hold five accounts at all, and the flow
    // cannot demand more than exists — the requirement drops to whatever the
    // list can supply.
    const required = accounts.length
        ? Math.min(MIN_FOLLOWS, accounts.length)
        : 0;
    // The one agreed escape: if suggestions never arrived there is nothing to
    // follow, so the gate must not hold the account hostage to a failing API.
    const canFinish = accounts.length === 0 || followedCount >= required;

    return (
        <>
            <h1 className="mt-2 text-2xl font-bold">
                {t("onboarding.accountsTitle", { n: MIN_FOLLOWS })}
            </h1>
            <p className="mt-2 text-[15px] text-white/50">
                {t("onboarding.accountsBody")}
            </p>

            <div className="mt-6 flex-1">
                {isLoading && (
                    <div className="flex justify-center py-16">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                    </div>
                )}

                {!isLoading && error && (
                    <div className="flex flex-col items-center gap-4 py-12 text-center">
                        <p className="text-sm text-red-400/60">{error}</p>
                        <Button variant="outline" size="sm" onClick={retry}>
                            {t("onboarding.tryAgain")}
                        </Button>
                    </div>
                )}

                {!isLoading && !error && accounts.length === 0 && (
                    <div className="flex flex-col items-center gap-2 py-12 text-center">
                        <h2 className="text-lg font-bold">
                            {t("onboarding.emptyTitle")}
                        </h2>
                        <p className="max-w-[320px] text-sm text-white/40">
                            {t("onboarding.emptyBody")}
                        </p>
                    </div>
                )}

                {!isLoading && accounts.length > 0 && (
                    <div className="-mx-4 border-t border-white/10">
                        {accounts.map((account) => (
                            <AccountCard
                                key={account.userId}
                                account={account}
                                isFollowing={followedIds.has(account.userId)}
                                isPending={isPending(account.userId)}
                                onToggle={toggle}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className="sticky bottom-0 -mx-4 flex items-center gap-3 border-t border-white/10 bg-black/80 px-4 py-4 backdrop-blur-md">
                <button
                    type="button"
                    onClick={onBack}
                    className="shrink-0 rounded-full px-4 py-2 text-sm font-medium text-white/50 transition-colors hover:text-white"
                >
                    {t("onboarding.back")}
                </button>
                <span className="flex-1 text-sm text-white/40">
                    {t("onboarding.progress", {
                        n: followedCount,
                        total: required,
                    })}
                </span>
                <Button disabled={!canFinish} onClick={onFinish}>
                    {t("onboarding.finish")}
                </Button>
            </div>
        </>
    );
}
