import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useI18n } from "../../../shared/hooks/useI18n";
import type { TranslationKey } from "../../../shared/i18n/translations";
import type { Notification, NotificationType } from "../api/notification.types";

interface NotificationCardProps {
    notification: Notification;
}

const MESSAGE_KEYS: Record<NotificationType, TranslationKey> = {
    FOLLOW: "notif.follow",
    NEW_POST: "notif.newPost",
    LIKE: "notif.like",
    COMMENT: "notif.comment",
    COMMENT_LIKE: "notif.commentLike",
    COMMENT_REPLY: "notif.commentReply",
    QUOTE: "notif.quote",
    MEDIA_REJECTED: "notif.mediaRejected",
};

/**
 * Where a `MEDIA_REJECTED` leads, or `null` when it leads nowhere.
 *
 * The comment wins over the post because it is the more specific of the two,
 * and it covers a comment on an article as well as one on a post — both are
 * read through `/comments/:commentId`. `articleId` and `articleSlug` arrive
 * alongside but are deliberately unread: the media was taken off the comment,
 * not off the top of the article.
 *
 * `null` is a real case, not a defensive one. Someone can upload a video and
 * never send the post, and the file is still checked — so the notice arrives
 * attached to nothing.
 */
function mediaRejectedTarget(notification: Notification): string | null {
    if (notification.commentId) return `/comments/${notification.commentId}`;
    if (notification.postId) return `/post/${notification.postId}`;
    return null;
}

type Translate = ReturnType<typeof useI18n>["t"];

function getRelativeTime(
    createdAt: string,
    t: Translate,
    locale: string,
): string {
    const diff = Date.now() - new Date(createdAt).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return t("notif.justNow");
    if (minutes < 60) return t("notif.minutesAgo", { n: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t("notif.hoursAgo", { n: hours });
    const days = Math.floor(hours / 24);
    if (days < 7) return t("notif.daysAgo", { n: days });
    return new Date(createdAt).toLocaleDateString(locale);
}

export function NotificationCard({ notification }: NotificationCardProps) {
    const navigate = useNavigate();
    const { t, locale } = useI18n();

    /*
     * The platform has no account, so the API fills `issuerId` with the
     * recipient's own id and `username`/`avatarUrl` with their own details.
     * Rendered like every other row that would tell the reader they did this
     * to themselves, over their own photo. This type drops all three.
     */
    const isPlatformNotice = notification.type === "MEDIA_REJECTED";
    const platformTarget = isPlatformNotice
        ? mediaRejectedTarget(notification)
        : null;
    const isClickable = !isPlatformNotice || platformTarget !== null;

    // `notification.type` is what the server sent, not what this union says it
    // can be. A value added to the API's enum after this build shipped lands
    // here as a `MESSAGE_KEYS` miss, and `t(undefined)` throws inside its
    // interpolation — which took the whole notification list down with it.
    const messageKey: TranslationKey =
        MESSAGE_KEYS[notification.type] ?? "notif.generic";

    function handleClick() {
        if (isPlatformNotice) {
            if (platformTarget) navigate(platformTarget);
            return;
        }

        switch (notification.type) {
            case "FOLLOW":
                navigate(`/profile/${notification.username}`);
                break;
            // A QUOTE's `referenceId` is the quote itself, not the post that
            // was quoted, so this lands on what was said about the post
            // rather than on the post the recipient already wrote.
            case "NEW_POST":
            case "LIKE":
            case "QUOTE":
                if (notification.referenceId) {
                    navigate(`/post/${notification.referenceId}`);
                } else {
                    navigate(`/profile/${notification.username}`);
                }
                break;
            case "COMMENT":
            case "COMMENT_LIKE":
            case "COMMENT_REPLY":
                if (notification.referenceId) {
                    navigate(`/comments/${notification.referenceId}`);
                }
                break;
            default:
                // A type this build has never heard of. The API owns the enum
                // and can grow it at any time, so the card degrades to the
                // issuer's profile rather than becoming a dead row.
                navigate(`/profile/${notification.username}`);
        }
    }

    return (
        <div
            onClick={isClickable ? handleClick : undefined}
            className={`flex items-start gap-3 px-4 py-4 border-b border-ink/10 transition-colors ${
                isClickable ? "hover:bg-ink/5 cursor-pointer" : ""
            } ${!notification.isRead ? "border-l-2 border-l-blue-500" : ""}`}
        >
            {/* Avatar, or the platform's own mark */}
            <div className="shrink-0 w-10 h-10 rounded-full overflow-hidden bg-surface-2">
                {isPlatformNotice ? (
                    <div className="w-full h-full flex items-center justify-center text-ink/50">
                        <ShieldAlert size={18} aria-hidden="true" />
                    </div>
                ) : notification.avatarUrl ? (
                    <img
                        src={notification.avatarUrl}
                        alt={notification.username}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-ink/40 text-sm font-bold">
                        {notification.username.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className="text-ink/90 text-[15px] leading-snug">
                    {isPlatformNotice
                        ? t(messageKey)
                        : t(messageKey, { username: notification.username })}
                </p>
                <p className="text-ink/40 text-xs mt-1">
                    {getRelativeTime(notification.createdAt, t, locale)}
                </p>
            </div>

            {/* Unread dot */}
            {!notification.isRead && (
                <div className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-blue-500" />
            )}
        </div>
    );
}
