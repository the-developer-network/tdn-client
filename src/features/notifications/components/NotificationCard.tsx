import { useNavigate } from "react-router-dom";
import type { Notification, NotificationType } from "../api/notification.types";

interface NotificationCardProps {
    notification: Notification;
}

function getMessage(type: NotificationType, username: string): string {
    switch (type) {
        case "FOLLOW":
            return `@${username} started following you`;
        case "NEW_POST":
            return `@${username} published a new post`;
        case "LIKE":
            return `@${username} liked your post`;
        case "COMMENT":
            return `@${username} commented on your post`;
        case "COMMENT_LIKE":
            return `@${username} liked your comment`;
    }
}

function getRelativeTime(createdAt: string): string {
    const diff = Date.now() - new Date(createdAt).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(createdAt).toLocaleDateString();
}

export function NotificationCard({ notification }: NotificationCardProps) {
    const navigate = useNavigate();

    function handleClick() {
        switch (notification.type) {
            case "FOLLOW":
                navigate(`/profile/${notification.username}`);
                break;
            case "NEW_POST":
            case "LIKE":
                navigate(`/post/${notification.referenceId}`);
                break;
            case "COMMENT":
            case "COMMENT_LIKE":
                navigate(`/comments/${notification.referenceId}`);
                break;
        }
    }

    return (
        <div
            onClick={handleClick}
            className={`flex items-start gap-3 px-4 py-4 border-b border-white/10 hover:bg-white/5 cursor-pointer transition-colors ${
                !notification.isRead ? "border-l-2 border-l-blue-500" : ""
            }`}
        >
            {/* Avatar */}
            <div className="shrink-0 w-10 h-10 rounded-full overflow-hidden bg-zinc-800">
                {notification.avatarUrl ? (
                    <img
                        src={notification.avatarUrl}
                        alt={notification.username}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/40 text-sm font-bold">
                        {notification.username.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className="text-white/90 text-[15px] leading-snug">
                    {getMessage(notification.type, notification.username)}
                </p>
                <p className="text-white/40 text-xs mt-1">
                    {getRelativeTime(notification.createdAt)}
                </p>
            </div>

            {/* Unread dot */}
            {!notification.isRead && (
                <div className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-blue-500" />
            )}
        </div>
    );
}
