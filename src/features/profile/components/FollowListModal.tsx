import { useNavigate } from "react-router-dom";
import { Modal } from "../../../shared/components/ui/Modal";
import { useFollowList } from "../hooks/useFollowList";

interface FollowListModalProps {
    isOpen: boolean;
    onClose: () => void;
    username: string;
    type: "followers" | "following";
}

export function FollowListModal({
    isOpen,
    onClose,
    username,
    type,
}: FollowListModalProps) {
    const navigate = useNavigate();
    const { users, isLoading, error } = useFollowList(username, type, isOpen);

    function handleUserClick(targetUsername: string) {
        onClose();
        navigate(`/profile/${targetUsername}`);
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="pt-14 pb-2">
                <h2 className="px-6 pb-3 text-base font-bold text-white border-b border-white/10 capitalize">
                    {type}
                </h2>

                <div className="max-h-[50vh] sm:max-h-[60vh] overflow-y-auto">
                    {isLoading && (
                        <div className="flex justify-center py-10">
                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        </div>
                    )}

                    {error && (
                        <p className="px-6 py-6 text-sm text-red-400 text-center">
                            {error}
                        </p>
                    )}

                    {!isLoading && !error && users.length === 0 && (
                        <p className="px-6 py-10 text-sm text-white/40 text-center">
                            {type === "followers"
                                ? "No followers yet."
                                : "Not following anyone yet."}
                        </p>
                    )}

                    {!isLoading &&
                        users.map((user) => (
                            <button
                                key={user.userId}
                                onClick={() => handleUserClick(user.username)}
                                className="w-full flex items-center gap-3 px-6 py-3 hover:bg-white/5 transition-colors text-left"
                            >
                                <img
                                    src={
                                        user.avatarUrl ||
                                        `https://ui-avatars.com/api/?name=${user.username}`
                                    }
                                    alt={user.username}
                                    className="w-10 h-10 rounded-full border border-white/10 object-cover shrink-0"
                                />
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-white truncate">
                                        {user.fullName || user.username}
                                    </p>
                                    <p className="text-xs text-white/40 truncate">
                                        @{user.username}
                                    </p>
                                    {user.bio && (
                                        <p className="text-xs text-white/30 truncate mt-0.5">
                                            {user.bio}
                                        </p>
                                    )}
                                </div>
                                {user.isFollowing && !user.isMe && (
                                    <span className="ml-auto shrink-0 text-xs text-white/40 border border-white/10 rounded-full px-2 py-0.5">
                                        Following
                                    </span>
                                )}
                            </button>
                        ))}
                </div>
            </div>
        </Modal>
    );
}
