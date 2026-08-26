import { getSafeImageSrc } from "../../../shared/utils/image-src";
import { useI18n } from "../../../shared/hooks/useI18n";
import type { OnboardingAccount } from "../onboarding.types";

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

                {/* Post and article authors carry neither a bio nor a follower
                    count; only the popularity fallback does. */}
                {account.bio && (
                    <p className="mt-1 line-clamp-2 text-sm text-white/60">
                        {account.bio}
                    </p>
                )}
                {account.followersCount !== undefined && (
                    <p className="mt-1.5 text-xs text-white/40">
                        {account.followersCount}{" "}
                        {account.followersCount === 1
                            ? t("profile.follower")
                            : t("profile.followerPlural")}
                    </p>
                )}
            </div>
        </div>
    );
}
