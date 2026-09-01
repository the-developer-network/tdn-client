import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "../../../shared/components/ui/Modal";
import { useFollowList } from "../hooks/useFollowList";
import { useFollowAction } from "../hooks/useFollowAction";
import { useAuthStore } from "../../../core/auth/auth.store";
import { useI18n } from "../../../shared/hooks/useI18n";
import type { FollowUser } from "../api/profile.types";

interface FollowListModalProps {
    isOpen: boolean;
    onClose: () => void;
    username: string;
    type: "followers" | "following";
    /**
     * Called with `1` or `-1` when a row in this list is followed or
     * unfollowed. Only wired up where the change actually moves a counter the
     * page is showing — see `ProfilePage`.
     */
    onFollowChange?: (delta: 1 | -1) => void;
}

interface FollowListRowProps {
    user: FollowUser;
    onNavigate: (username: string) => void;
    onAuthRequired: () => void;
    onFollowChange?: (delta: 1 | -1) => void;
}

function FollowListRow({
    user,
    onNavigate,
    onAuthRequired,
    onFollowChange,
}: FollowListRowProps) {
    const { t } = useI18n();
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    // `FollowUser` carries no follower count and this list shows none, so the
    // count this hook tracks is passed in as 0 and ignored.
    const { isFollowing, isLoading, handleFollow } = useFollowAction(
        user.userId,
        user.isFollowing,
        0,
    );

    // Reporting the change by watching `isFollowing` rather than from the
    // click handler means a rolled-back request reports its reversal too, so
    // a counter fed from here cannot drift away from the button.
    const reported = useRef(isFollowing);
    useEffect(() => {
        if (reported.current === isFollowing) return;
        reported.current = isFollowing;
        onFollowChange?.(isFollowing ? 1 : -1);
    }, [isFollowing, onFollowChange]);

    function handleFollowClick(e: React.MouseEvent) {
        e.stopPropagation();
        // `handleFollow` opens the auth modal itself, and that modal shares
        // this one's z-index — close the list first so they do not stack.
        if (!isAuthenticated) onAuthRequired();
        handleFollow();
    }

    // 44px tall below `sm`. The compact pill measured 26px on a phone, and a
    // thumb aimed at it lands on the row instead — which opens the profile,
    // so the button reads as doing nothing.
    const buttonClasses = [
        "ml-auto shrink-0 flex items-center justify-center",
        "min-h-11 px-4 sm:min-h-0 sm:px-3 sm:py-1",
        "rounded-full text-xs font-semibold transition-colors",
        "disabled:opacity-50",
        isFollowing
            ? "bg-transparent border border-ink/30 text-ink hover:border-red-500/60 hover:text-red-400"
            : "bg-ink text-ground hover:bg-ink/90",
    ].join(" ");

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => onNavigate(user.username)}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onNavigate(user.username);
                }
            }}
            className="w-full flex items-center gap-3 px-6 py-3 hover:bg-ink/5 transition-colors text-left cursor-pointer"
        >
            <img
                src={
                    user.avatarUrl ||
                    `https://ui-avatars.com/api/?name=${user.username}`
                }
                alt={user.username}
                className="w-10 h-10 rounded-full border border-ink/10 object-cover shrink-0"
            />
            <div className="min-w-0">
                <p className="text-sm font-semibold text-ink truncate">
                    {user.fullName || user.username}
                </p>
                <p className="text-xs text-ink/40 truncate">@{user.username}</p>
                {user.bio && (
                    <p className="text-xs text-ink/30 truncate mt-0.5">
                        {user.bio}
                    </p>
                )}
            </div>
            {!user.isMe && (
                <button
                    type="button"
                    onClick={handleFollowClick}
                    disabled={isLoading}
                    className={buttonClasses}
                >
                    {isFollowing ? t("profile.following") : t("profile.follow")}
                </button>
            )}
        </div>
    );
}

export function FollowListModal({
    isOpen,
    onClose,
    username,
    type,
    onFollowChange,
}: FollowListModalProps) {
    const navigate = useNavigate();
    const { t } = useI18n();
    const { users, isLoading, isLoadingMore, error, hasMore, loadMore } =
        useFollowList(username, type, isOpen);

    function handleUserClick(targetUsername: string) {
        onClose();
        navigate(`/profile/${targetUsername}`);
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="pt-14 pb-2">
                <h2 className="px-6 pb-3 text-base font-bold text-ink border-b border-ink/10">
                    {type === "followers"
                        ? t("profile.followers")
                        : t("profile.followingCount")}
                </h2>

                <div className="max-h-[50vh] sm:max-h-[60vh] overflow-y-auto">
                    {isLoading && (
                        <div className="flex justify-center py-10">
                            <div className="w-5 h-5 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
                        </div>
                    )}

                    {error && (
                        <p className="px-6 py-6 text-sm text-red-400 text-center">
                            {error}
                        </p>
                    )}

                    {!isLoading && !error && users.length === 0 && (
                        <p className="px-6 py-10 text-sm text-ink/40 text-center">
                            {type === "followers"
                                ? t("followList.noFollowers")
                                : t("followList.noFollowing")}
                        </p>
                    )}

                    {!isLoading &&
                        users.map((user) => (
                            <FollowListRow
                                key={user.userId}
                                user={user}
                                onNavigate={handleUserClick}
                                onAuthRequired={onClose}
                                onFollowChange={onFollowChange}
                            />
                        ))}

                    {hasMore && !isLoadingMore && (
                        <div className="flex justify-center py-4">
                            <button
                                type="button"
                                onClick={loadMore}
                                className="rounded-full border border-ink/20 px-6 py-2 text-sm text-ink/70 hover:bg-ink/5 hover:text-ink transition-colors"
                            >
                                {t("common.loadMore")}
                            </button>
                        </div>
                    )}

                    {isLoadingMore && (
                        <div className="flex justify-center py-4">
                            <div className="w-5 h-5 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}
