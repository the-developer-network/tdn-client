import { useNavigate } from "react-router-dom";
import { useFollowAction } from "../hooks/useFollowAction";
import { useI18n } from "../../../shared/hooks/useI18n";
import type { SuggestedUser } from "../api/profile.types";

interface SuggestionCardProps {
    user: SuggestedUser;
}

export function SuggestionCard({ user }: SuggestionCardProps) {
    const navigate = useNavigate();
    const { t } = useI18n();
    const { isFollowing, followersCount, isLoading, handleFollow } =
        useFollowAction(user.userId, user.isFollowing, user.followersCount);

    function handleCardClick() {
        navigate(`/profile/${user.username}`);
    }

    function handleFollowClick(e: React.MouseEvent) {
        e.stopPropagation();
        handleFollow();
    }

    return (
        <div
            className="flex items-start gap-3 px-4 py-4 border-b border-ink/10 hover:bg-ink/5 cursor-pointer transition-colors"
            onClick={handleCardClick}
        >
            {/* Avatar */}
            <div className="shrink-0 w-10 h-10 rounded-full overflow-hidden bg-surface-2">
                {user.avatarUrl ? (
                    <img
                        src={user.avatarUrl}
                        alt={user.fullName}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-ink/40 text-sm font-bold">
                        {user.fullName.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="font-semibold text-ink text-[15px] truncate">
                            {user.fullName}
                        </p>
                        <p className="text-ink/50 text-sm truncate">
                            @{user.username}
                        </p>
                    </div>

                    {!user.isMe && (
                        <button
                            onClick={handleFollowClick}
                            disabled={isLoading}
                            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors disabled:opacity-50 ${
                                isFollowing
                                    ? "bg-transparent border border-ink/30 text-ink hover:border-red-500/60 hover:text-red-400"
                                    : "bg-ink text-ground hover:bg-ink/90"
                            }`}
                        >
                            {isFollowing
                                ? t("profile.following")
                                : t("profile.follow")}
                        </button>
                    )}
                </div>

                {user.bio && (
                    <p className="text-ink/60 text-sm mt-1 line-clamp-2">
                        {user.bio}
                    </p>
                )}

                <p className="text-ink/40 text-xs mt-1.5">
                    {followersCount}{" "}
                    {followersCount === 1
                        ? t("profile.follower")
                        : t("profile.followerPlural")}
                </p>
            </div>
        </div>
    );
}
