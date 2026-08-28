import { getSafeImageSrc } from "../../../shared/utils/image-src";
import { CATEGORY_OPTIONS } from "../../../shared/constants/categories";
import { useI18n } from "../../../shared/hooks/useI18n";
import type { TranslationKey } from "../../../shared/i18n/translations";
import type { PostCategory } from "../../feed/api/feed.types";
import type { OnboardingAccount } from "../onboarding.types";

/**
 * Built from the same five options the picker offers, so a chip can never name
 * a field the user was not able to choose.
 */
const CATEGORY_LABELS = new Map<PostCategory, TranslationKey>(
    CATEGORY_OPTIONS.map(({ value, labelKey }) => [value, labelKey]),
);

interface AccountCardProps {
    account: OnboardingAccount;
    isFollowing: boolean;
    isPending: boolean;
    onToggle: (userId: string) => void;
}

export function AccountCard({
    account,
    isFollowing,
    isPending,
    onToggle,
}: AccountCardProps) {
    const { t } = useI18n();
    const avatar = getSafeImageSrc(account.avatarUrl);

    return (
        <div className="flex items-start gap-3 border-b border-white/10 px-4 py-4">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-800">
                {avatar ? (
                    <img
                        src={avatar}
                        alt=""
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white/40">
                        {account.fullName.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold text-white">
                            {account.fullName}
                        </p>
                        <p className="truncate text-sm text-white/50">
                            @{account.username}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => onToggle(account.userId)}
                        disabled={isPending}
                        className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                            isFollowing
                                ? "border border-white/30 bg-transparent text-white hover:border-red-500/60 hover:text-red-400"
                                : "bg-white text-black hover:bg-white/90"
                        }`}
                    >
                        {isFollowing
                            ? t("profile.following")
                            : t("profile.follow")}
                    </button>
                </div>

                {/* Bot bios open with an emoji and a headline and then run on
                    for a paragraph, so the row clamps rather than grows. */}
                {account.bio && (
                    <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-white/60">
                        {account.bio}
                    </p>
                )}

                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-xs text-white/40">
                        {account.followersCount}{" "}
                        {account.followersCount === 1
                            ? t("profile.follower")
                            : t("profile.followerPlural")}
                    </span>
                    {/* Why this bot is on the list. It earns its place when
                        two fields were picked and the rows look interleaved
                        for no visible reason. */}
                    {account.categories.map((category) => {
                        const labelKey = CATEGORY_LABELS.get(category);
                        if (!labelKey) return null;
                        return (
                            <span
                                key={category}
                                className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-white/50"
                            >
                                {t(labelKey)}
                            </span>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
