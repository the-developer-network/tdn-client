import { useNavigate } from "react-router-dom";
import { useFollowAction } from "../hooks/useFollowAction";
import type { SuggestedUser } from "../api/profile.types";

interface SuggestionCardProps {
    user: SuggestedUser;
}

export function SuggestionCard({ user }: SuggestionCardProps) {
    const navigate = useNavigate();
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
            className="flex items-start gap-3 px-4 py-4 border-b border-white/10 hover:bg-white/5 cursor-pointer transition-colors"
            onClick={handleCardClick}
        >
            {/* Avatar */}
            <div className="shrink-0 w-10 h-10 rounded-full overflow-hidden bg-zinc-800">
                {user.avatarUrl ? (
                    <img
                        src={user.avatarUrl}
                        alt={user.fullName}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/40 text-sm font-bold">
                        {user.fullName.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="font-semibold text-white text-[15px] truncate">
                            {user.fullName}
                        </p>
                        <p className="text-white/50 text-sm truncate">
                            @{user.username}
                        </p>
                    </div>

                    {!user.isMe && (
                        <button
                            onClick={handleFollowClick}
                            disabled={isLoading}
                            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors disabled:opacity-50 ${
                                isFollowing
                                    ? "bg-transparent border border-white/30 text-white hover:border-red-500/60 hover:text-red-400"
                                    : "bg-white text-black hover:bg-white/90"
                            }`}
                        >
                            {isFollowing ? "Following" : "Follow"}
                        </button>
                    )}
                </div>

                {user.bio && (
                    <p className="text-white/60 text-sm mt-1 line-clamp-2">
                        {user.bio}
                    </p>
                )}

                <p className="text-white/40 text-xs mt-1.5">
                    {followersCount}{" "}
                    {followersCount === 1 ? "follower" : "followers"}
                </p>
            </div>
        </div>
    );
}
